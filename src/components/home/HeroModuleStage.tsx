"use client";

import dynamic from "next/dynamic";

import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import { GamePlayHost } from "@/components/play/GamePlayHost";
import type { HeroPreview } from "@/lib/home/heroPreviewData";

// Each preview is wrapped once, here, at module scope. Calling dynamic()
// during render would mint a new component identity on every pass and
// remount the island under the reader. Both are ssr:false because both
// measure or animate on mount, which Next permits only inside a Client
// Component — this file is that boundary.
const LazyMigrationPaths = dynamic(
  () =>
    import("@/components/home/HeroMigrationPaths").then(
      (mod) => mod.HeroMigrationPaths
    ),
  { ssr: false, loading: () => <HeroStagePlaceholder /> }
);

const LazyFamilyCrown = dynamic(
  () =>
    import("@/components/home/HeroFamilyCrown").then(
      (mod) => mod.HeroFamilyCrown
    ),
  { ssr: false, loading: () => <HeroStagePlaceholder /> }
);

export interface HeroModuleStageProps {
  preview: HeroPreview;
  /** Documented peoples per country, for the branches that draw the continent. */
  peopleCountsByCountry?: Record<string, number>;
}

/**
 * Renders whatever the drawn module turned out to need (REQ-115).
 *
 * The switch is the second half of HeroPreviewKind's contract — the first
 * is loadHeroPreview, which resolves the data. With strictNullChecks off a
 * missing case here would return undefined and compile clean, so
 * exhaustiveness is asserted by this component's own suite rather than by
 * the compiler.
 *
 * Every branch occupies the same reserved box, and each preview's loading
 * placeholder matches the height of the thing that replaces it: the draw
 * happens on the server and never changes within a page view, so the only
 * layout shift available is the fallback-to-island swap.
 */
// @req REQ-115
export function HeroModuleStage({
  preview,
  peopleCountsByCountry,
}: HeroModuleStageProps) {
  switch (preview.kind) {
    case "globe":
      return (
        <ContinentGlobeStage peopleCountsByCountry={peopleCountsByCountry} />
      );

    case "game":
      return (
        <div className="hero-stage-box">
          <GamePlayHost game={preview.game} rounds={preview.rounds} />
          <HeroStageStyles />
        </div>
      );

    case "migration-paths":
      return <LazyMigrationPaths paths={preview.paths} />;

    case "family-crown":
      return <LazyFamilyCrown families={preview.families} />;

    default:
      // A kind with no branch would otherwise render nothing at all. The
      // globe is what the band showed before this slot existed.
      return (
        <ContinentGlobeStage peopleCountsByCountry={peopleCountsByCountry} />
      );
  }
}

/** Holds the box open while a preview island loads. */
function HeroStagePlaceholder() {
  return (
    <div className="hero-stage-box" aria-hidden="true">
      <HeroStageStyles />
    </div>
  );
}

/**
 * The reserved stage, on .home-globe-stage's own floors so the seam lands
 * in the same place whichever module was drawn.
 */
function HeroStageStyles() {
  return (
    <style>{`
      .hero-stage-box {
        box-sizing: border-box;
        width: 100%;
        max-width: 960px;
        margin: 0 auto;
        min-height: 460px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      @media (min-width: 720px) {
        .hero-stage-box { min-height: 540px; }
      }
      /* The stage used to zero its floor here and grow into the hero band's
         \`min-height: calc(100dvh - 56px)\` instead. That worked only while it
         was inside a band a viewport tall; the module now stands in its own
         section in the page flow, and \`min-height: 0\` left it 0px tall with
         every test still green — the same coupling that collapsed the globe
         on /jouer/mercator. The floor is its own at every width now. */
      @media (min-width: 1200px) {
        .hero-stage-box { min-height: 600px; }
      }
    `}</style>
  );
}

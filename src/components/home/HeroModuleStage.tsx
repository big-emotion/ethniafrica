"use client";

import { GamePlayHost } from "@/components/play/GamePlayHost";
import { HERO_PREVIEWS } from "@/components/home/heroPreviews";
import { HomeGlobeStage } from "@/components/home/HomeGlobeStage";
import type { HeroPreview } from "@/lib/home/heroPreviewData";

export interface HeroModuleStageProps {
  preview: HeroPreview;
}

/**
 * Renders whatever the drawn module turned out to need (REQ-115). The
 * client boundary lives here rather than in HomeHero so the hero itself
 * stays a server component: only the preview lookup has to be client-side,
 * because previews are `ssr:false` islands.
 *
 * Every game shares one branch. GamePlayHost already is the boundary the
 * game page uses, so eleven games cost one line here and no entry in the
 * preview map — the registry's "game" kind is the whole declaration.
 *
 * A standalone id with no preview falls back to the globe rather than
 * leaving the band empty. heroPreviews.test.tsx makes that unreachable, so
 * the branch is defence in depth, not behaviour to rely on.
 */
// @req REQ-115
export function HeroModuleStage({ preview }: HeroModuleStageProps) {
  if (preview.kind === "game") {
    return (
      // GamePlayHost defers its island without a loading state of its own,
      // so the box has to declare the height here — otherwise the band
      // grows under the reader the moment the island lands. The floors
      // match .home-globe-stage's, so the seam sits in the same place
      // whichever module was drawn.
      <div className="hero-game-stage">
        <GamePlayHost game={preview.game} rounds={preview.rounds} />
        <style>{`
          .hero-game-stage {
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
            .hero-game-stage { min-height: 540px; }
          }
          @media (min-width: 1200px) {
            .hero-game-stage { flex: 1 1 auto; min-height: 0; }
          }
        `}</style>
      </div>
    );
  }

  const Preview = HERO_PREVIEWS[preview.moduleId] ?? HomeGlobeStage;
  return <Preview />;
}

export default HeroModuleStage;

import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import { HeroModuleStage } from "@/components/home/HeroModuleStage";
import { HeroProvenanceChip } from "@/components/home/HeroProvenanceChip";
import { SectionHeading } from "@/components/home/SectionHeading";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { HeroPreview } from "@/lib/home/heroPreviewData";

export interface FeaturedModuleProps {
  /**
   * The module drawn for this request (REQ-115). Either it or its preview
   * being absent keeps the globe the slot has always shown, unlabelled,
   * because a provenance chip over a fallback would name a module the
   * reader is not looking at.
   */
  heroModule?: HubModule | null;
  heroPreview?: HeroPreview | null;
  /**
   * Documented peoples per country, for whichever branch ends up drawing the
   * continent. Resolved on the server because it is a Supabase round trip;
   * absent, the globe names what is missing rather than drawing nothing.
   */
  peopleCountsByCountry?: Record<string, number>;
}

/**
 * The module the home puts forward, as its own section (REQ-113, REQ-115).
 *
 * It used to sit inside the hero band, directly under the headline, with no
 * heading of its own: the reader met a globe and had to work out from its
 * controls that it was a game they could play. It now follows the sourced
 * anecdote and says what it is before it is touched.
 *
 * The heading reads the drawn module's axis rather than stating « jeu »
 * outright. HERO_SLOT_KINDS admits three preview shapes and only the globe
 * is filed under Jouer, so a hard-coded « Le jeu du mois » would become
 * false the first time the band opened on family-crown or migration-paths
 * — the same way Jouer's card once promised « 2 peuples face à face » long
 * after the hub had grown past one comparison module.
 *
 * « du mois » is an editorial claim, not a computed one: the slot is drawn
 * per request and pinned to one default (heroRotation.ts). It holds today
 * because the pin does not move; the day a real monthly cadence lands, it
 * should read itself from that cadence rather than from this string.
 *
 * One door, and it is the chip. The section also carried a filled button
 * under the stage naming the same module and holding the same href — a slab
 * of accent closing the section, read as its conclusion rather than as a way
 * in. The chip sits where the reader actually meets the module, so it is the
 * one that stays.
 */
// @req REQ-113
// @req REQ-115
export function FeaturedModule({
  heroModule = null,
  heroPreview = null,
  peopleCountsByCountry,
}: FeaturedModuleProps = {}) {
  const labelled = heroModule && heroPreview;
  const isGame = heroModule?.accessMode === "jouer";

  return (
    <section
      className={
        labelled
          ? `home-featured ${ACCENT_BY_ACCESS_MODE[heroModule.accessMode]}`
          : "home-featured"
      }
      data-testid="home-featured-module"
    >
      <SectionHeading
        centred
        eyebrow={isGame ? "Le jeu du mois" : "Le module du mois"}
        title={
          isGame
            ? "Un jeu tiré du corpus, à essayer maintenant."
            : "Un module de l'atlas, à essayer maintenant."
        }
        testId="home-featured-heading"
      />

      {/* The module says what it is from its own readout — the globe's
          tracks the morph — so the section adds only where the
          module can be found again, never a second caption describing it.
          The accent wrapper above is the whole colour decision: the chip
          and the stage read --accent off the drawn module's axis without
          either of them learning which axis that was. */}
      <div className="home-globe-holder">
        {labelled ? (
          <>
            <HeroProvenanceChip language="fr" module={heroModule} />
            <HeroModuleStage
              preview={heroPreview}
              peopleCountsByCountry={peopleCountsByCountry}
            />
          </>
        ) : (
          <ContinentGlobeStage peopleCountsByCountry={peopleCountsByCountry} />
        )}
      </div>

      <style>{`
        .home-featured {
          position: relative;
          overflow: hidden;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          padding: 48px 24px 56px;
          display: flex;
          flex-direction: column;
          background: var(--afh-bg);
          color: var(--afh-text);
          border-top: 1px solid var(--afh-border);
        }

        /* The stage sizes itself from its own contents. The hero used to
           lend it a viewport height, and that height went with it — a
           min-height here would borrow the section's instead and collapse
           the stage on any surface that does not fill it. */
        .home-globe-holder {
          position: relative;
          background: var(--afh-bg);
          padding-top: 16px;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 700px) {
          .home-featured { padding: 34px 20px 40px; }
        }
      `}</style>
    </section>
  );
}

export default FeaturedModule;

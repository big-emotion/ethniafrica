import { CountrySynthesisCard } from "@/components/home/CountrySynthesisCard";
import { SectionHeading } from "@/components/home/SectionHeading";
import type { CountrySynthesis } from "@/lib/home/countrySynthesis";
import { ActionLink } from "@/components/ui/ActionLink";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

export interface SynthesisRailProps {
  language: Language;
  syntheses: CountrySynthesis[];
}

/**
 * Three countries, drawn from the corpus, shown rather than described.
 *
 * The band used to show four cards in a track wider than the page, which
 * bought it a horizontal scroll and two arrows to reach the card hanging off
 * the edge. Three cards fill the same width whole, so there is nothing out of
 * view to page to: the arrows are gone, the scroll with them, and the section
 * renders on the server with no hydration at all.
 */
// @req REQ-113
export function SynthesisRail({ language, syntheses }: SynthesisRailProps) {
  if (syntheses.length === 0) return null;

  return (
    <section
      className="home-syn afh-accent-teal"
      data-testid="home-synthesis-rail"
    >
      <SectionHeading
        eyebrow="Ce que contient une fiche"
        title="Trois pays, pris dans l'atlas"
        className="home-syn-head"
      />

      <div className="home-syn-track">
        {syntheses.map((synthesis) => (
          <CountrySynthesisCard
            key={synthesis.id}
            language={language}
            synthesis={synthesis}
          />
        ))}
      </div>

      <p className="home-syn-all">
        <ActionLink href={getLocalizedRoute(language, "countries")}>
          Voir les 54 pays
        </ActionLink>
      </p>

      <style>{`
        .home-syn {
          background: var(--afh-bg);
          padding: 44px 0 40px;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }
        /* The eyebrow and the title come from the shared unit
           (src/styles/section-heading.css) — this section was one of the two
           hand-set spellings the unit was extracted from. The grid below
           carries the gap, so the shorthand drops the unit's bottom margin. */
        .home-syn-head {
          margin: 0 auto;
          padding: 0 22px;
          max-width: 1200px;
        }
        /* One column on a phone, where three side by side would each be too
           narrow to read; three from the tablet breakpoint up, filling the
           width the four-card track used to overflow. */
        .home-syn-track {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          padding: 22px;
          max-width: 1200px;
          margin: 0 auto;
        }
        /* The rail's exit is an ActionLink (actions charter form A): it
           brings its own dress, so this rule only places it. */
        .home-syn-all {
          margin: 0 auto;
          padding: 0 22px;
          max-width: 1200px;
        }
        @media (min-width: 720px) {
          .home-syn { padding: 60px 0 52px; }
          .home-syn-head, .home-syn-track, .home-syn-all { padding-left: 40px; padding-right: 40px; }
          .home-syn-track { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </section>
  );
}

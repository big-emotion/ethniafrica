"use client";

import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import { GamePlayIsland } from "@/components/play/GamePlayIsland";
import type { GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import type { ScaleFact } from "@/lib/games/scaleFacts";
import type { Language } from "@/types/shared";
import { gamesCopy } from "@/lib/i18n/copy/games";

/**
 * The vote of 4 September 2026, as the reader can go and check it.
 *
 * Cited rather than summarised away: the page has spent the whole session
 * arguing that a projection shrinks a continent, and this is the moment that
 * argument stopped being only ours. ONU Info publishes in French, so the
 * reader who follows the link lands in the language they were reading in.
 */
const UN_RESOLUTION_SOURCE = {
  href: "https://news.un.org/fr/story/2026/09/1159416",
  label: "ONU Info, 4 septembre 2026",
} as const;

export interface MercatorSurfaceProps {
  game: GameDefinition;
  rounds: GameRound[];
  language: Language;
  facts: ScaleFact[];
  corpusLimited: boolean;
  /**
   * How much ground the sphere beside it covers, measured server-side off the
   * same outlines the globe is drawn from — see `buildTrueSizeClaim`. It
   * arrives worded rather than as figures so `WORLD_COMPARE` stays out of this
   * island's bundle.
   */
  trueSizeClaimFr: string;
  trueSizeClaimEn?: string;
  /**
   * Documented peoples per country, for the continent the stage draws.
   * Resolved by the page; absent, the globe names what is missing.
   */
  peopleCountsByCountry?: Record<string, number>;
}

/**
 * The Mercator page: the globe and the round, in one surface (REQ-120).
 *
 * **The same globe the home shows, on the same terms.** Charter §11, amended
 * 2026-09-06. The page used to pin the projection to the round — flat while a
 * question stood, closing into a sphere on the reveal — so that a reader
 * glancing left read the lie the round is asked against rather than the truth
 * that would answer it. Two things were wrong with it. The pin withdraws the
 * morph bar, so the demonstration the page is named after had no control on
 * it for seven eighths of a session; and the legend beneath a Mercator map
 * still read « Afrique à sa surface réelle », which is the lie labelled as
 * the truth — worse than either end of the slider on its own.
 *
 * The cheat the pin defended against is narrower than it looks. This scene
 * sets `targetPicker="none"`: no country is marked and none is named, so
 * reading « Libye ou Soudan ? » off the sphere means already knowing both
 * outlines by heart. That is knowledge, not eyesight, and the kill test is
 * about eyesight.
 *
 * **Why the claim stands under it.** A sphere is a picture of a continent, not
 * a measurement of one. `buildTrueSizeClaim` measures the ground the sphere
 * covers off the same outlines it is drawn from, and the UN vote of September
 * 2026 records that the argument is now one states have taken a position on.
 *
 * **Why the round comes first.** Charter §9.1: the stem and every option fit
 * above the fold at 430 px, and if a stage cannot fit it is the stage that
 * shrinks, never the options that get pushed off. The stage floor is 560 px
 * on a phone, so with the globe above it the round began below the fold — on
 * the capture that prompted this work, at 1200 px and up, none of the game
 * was visible at all. Shrinking the globe would have obeyed the rule by
 * degrading the one thing the page is named after. Putting the round first
 * obeys it without touching the globe, and first *in the document* rather
 * than merely painted first, so the tab order and a screen reader meet the
 * question before the illustration.
 */
// @req REQ-120
export const MercatorSurface = ({
  game,
  rounds,
  language,
  facts,
  corpusLimited,
  trueSizeClaimFr,
  trueSizeClaimEn,
  peopleCountsByCountry,
}: MercatorSurfaceProps) => {
  const copy = gamesCopy[language];
  const trueSizeClaim =
    language === "en" ? (trueSizeClaimEn ?? trueSizeClaimFr) : trueSizeClaimFr;
  return (
    <div className="mercator-surface">
      {/*
        The round comes first in the document, always. That is what actually
        answers charter §9.1 on a phone: the stage floor is 560 px, so a globe
        placed above would push the options off the fold, and the rule says it
        is the stage that gives way rather than the options. Keeping it first
        in source — not merely painted first — means the tab order and a
        screen reader meet the question before the illustration too.
      */}
      <div className="mercator-round">
        <GamePlayIsland
          game={game}
          rounds={rounds}
          language={language}
          facts={facts}
          corpusLimited={corpusLimited}
        />
      </div>

      <div className="mercator-stage">
        {/* The home's own call, prop for prop: one visual object, mounted the
            same way on both surfaces. Unpinned, so the morph bar is the
            reader's throughout — moving it *is* the demonstration. */}
        <ContinentGlobeStage
          language={language}
          peopleCountsByCountry={peopleCountsByCountry}
          presentation="hero"
          autoRotate
        />

        <aside className="mercator-true-size" data-testid="mercator-true-size">
          <h2 className="mercator-true-size-heading">{copy.trueSizeHeading}</h2>
          <p className="mercator-true-size-claim">{trueSizeClaim}</p>
          <p className="mercator-true-size-resolution">
            {copy.unResolution}{" "}
            <a
              href={UN_RESOLUTION_SOURCE.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.unSourceLabel}
            </a>
          </p>
        </aside>
      </div>

      <style>{`
        .mercator-surface {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Mobile and tablet: source order, in every phase — question, then
           globe, then what the globe is a picture of. Painted order used to
           flip on the reveal so the sphere closing could be watched; there is
           no closing left to watch now that the reader owns the slider
           throughout, and reordering a page under someone mid-session was the
           cost of that effect. */

        /* The claim reads as the globe's own caption, not as a paragraph that
           happens to sit under it: same measure, hairline above, and the
           accent on the heading the surface already carries. */
        .mercator-true-size {
          max-width: 62ch;
          margin: 16px auto 0;
          padding-top: 16px;
          border-top: 1px solid var(--afh-border);
        }

        .mercator-true-size-heading {
          margin: 0 0 8px;
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h3);
          color: var(--accent);
        }

        .mercator-true-size-claim {
          margin: 0 0 8px;
          font-size: var(--afh-text-body);
          color: var(--afh-text);
        }

        .mercator-true-size-resolution {
          margin: 0;
          font-size: var(--afh-text-caption);
          color: var(--afh-fg-muted);
        }

        .mercator-true-size-resolution a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* Desktop: side by side — the globe and its caption hold the left
           column, the round the right. The stage keeps its own max-width; the
           column simply stops it growing further. */
        @media (min-width: 1200px) {
          .mercator-surface {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
            align-items: start;
            gap: 40px;
          }
          .mercator-surface .mercator-stage {
            grid-column: 1;
            grid-row: 1;
          }
          .mercator-surface .mercator-round {
            grid-column: 2;
            grid-row: 1;
            position: sticky;
            top: 24px;
          }
        }
      `}</style>
    </div>
  );
};

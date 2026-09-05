"use client";

import { useCallback, useState } from "react";

import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import { GamePlayIsland } from "@/components/play/GamePlayIsland";
import type { GameSessionStatus } from "@/hooks/use-game-session";
import type { GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import type { ScaleFact } from "@/lib/games/scaleFacts";
import type { Language } from "@/types/shared";

const COPY_FR = {
  flatLock: "Le globe se rouvre avec la réponse.",
} as const;

export interface MercatorSurfaceProps {
  game: GameDefinition;
  rounds: GameRound[];
  language: Language;
  facts: ScaleFact[];
  corpusLimited: boolean;
  /**
   * Documented peoples per country, for the continent the stage draws.
   * Resolved by the page; absent, the globe names what is missing.
   */
  peopleCountsByCountry?: Record<string, number>;
}

/**
 * The Mercator page: the globe and the round, in one surface (REQ-120).
 *
 * **Why the globe now moves with the round.** The stage and the play loop
 * used to be siblings that never spoke. The page therefore asserted that the
 * projection lies, and proved it in a picture that reacted to nothing — the
 * claim and its evidence on the same screen, not touching.
 *
 * **Why the flat map during the question.** Games charter §1 forbids a
 * manipulable globe beside a live round, and is right to: an area-true sphere
 * next to « lequel est le plus grand ? » lets the reader answer by eye, which
 * is the shape-guessing the charter retired as a category. Holding the map
 * flat turns that objection inside out. The globe beside a live round is only
 * cheating when it tells the truth; the flat map is the lie the round is
 * asked against, so reading it gives the *wrong* answer. The sphere closes on
 * the reveal, and the slider stops being a toy and becomes the round's own
 * dramaturgy.
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
  peopleCountsByCountry,
}: MercatorSurfaceProps) => {
  const [phase, setPhase] = useState<GameSessionStatus>("answering");

  // Stable identity: the island reports the phase from an effect, and a fresh
  // callback each render would make that effect fire on every render.
  const handlePhaseChange = useCallback((status: GameSessionStatus) => {
    setPhase(status);
  }, []);

  const questionStands = phase === "answering";

  return (
    <div className="mercator-surface" data-phase={phase}>
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
          onPhaseChange={handlePhaseChange}
        />
      </div>

      <div className="mercator-stage">
        <ContinentGlobeStage
          peopleCountsByCountry={peopleCountsByCountry}
          pinnedProjection={questionStands ? "flat" : "sphere"}
          // Nothing to explain once the sphere is back: the pin withdraws the
          // toggle rather than disabling it, so there is no dead control on
          // screen for a sentence to account for — and repeating the promise
          // the reveal has just kept would read as a stuck caption.
          pinnedProjectionNote={questionStands ? COPY_FR.flatLock : undefined}
        />
      </div>

      <style>{`
        .mercator-surface {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Mobile and tablet: source order, so nothing is reordered while the
           reader is deciding — question, then globe.

           The one exception is the reveal, where the globe is raised above
           the verdict: watching the flat map close into a sphere *is* the
           answer, and leaving it below the fold would spend the payoff on
           nobody. Painted order and source order diverge for that one state.
           It is a considered trade rather than an oversight: the reveal has
           no decision left in it, its sequence still reads sensibly as
           verdict-then-illustration, and the alternative was to hide the
           demonstration the whole page exists for. */
        .mercator-surface[data-phase="revealed"] .mercator-stage { order: 1; }
        .mercator-surface[data-phase="revealed"] .mercator-round { order: 2; }

        /* Desktop: side by side, and the reordering stops entirely — both
           are above the fold, so the globe holds the left column and the
           round the right, in every phase. The stage keeps its own
           max-width; the column simply stops it growing further. */
        @media (min-width: 1200px) {
          .mercator-surface {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
            align-items: start;
            gap: 40px;
          }
          .mercator-surface .mercator-stage {
            order: initial;
            grid-column: 1;
            grid-row: 1;
          }
          .mercator-surface .mercator-round {
            order: initial;
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

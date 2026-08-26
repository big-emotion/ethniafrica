"use client";

import type { GameDefinition } from "@/lib/games/gameRegistry";
import { cn } from "@/lib/utils";

const COPY_FR = {
  heading: "Partie terminée",
  scoreSeparator: "sur",
  scoreCaption: "réponses exactes",
  playAgain: "Rejouer",
  emptyCorpus:
    "Le corpus ne contient pas encore assez de fiches pour composer un tour de ce jeu.",
  emptyCorpusHint:
    "Ce jeu s'ouvrira quand les fiches correspondantes auront été publiées.",
} as const;

export interface GameScoreCardProps {
  game: GameDefinition;
  correct: number;
  total: number;
  onPlayAgain: () => void;
  className?: string;
}

/**
 * End of a game session (REQ-120, UX-DR27/34): a flat statement of the score,
 * no confetti and no audience segment — a game is not levelled the way the
 * quiz is, so there is nothing to name here beyond the game itself.
 *
 * `total === 0` is a legitimate outcome, not a failure: the relations and
 * migrations games are capped by what the corpus holds, and REQ-120 asks for
 * that shortfall to be said out loud instead of rendering an empty screen.
 * Replay is withheld there, since replaying nothing only repeats the message.
 */
// @req REQ-120
export const GameScoreCard = ({
  game,
  correct,
  total,
  onPlayAgain,
  className,
}: GameScoreCardProps) => {
  const hasRounds = total > 0;

  return (
    <div
      data-testid="game-score-card"
      className={cn(
        "flex flex-col items-center gap-4 rounded-afh-lg border border-afh-border bg-afh-surface p-6 text-center",
        className
      )}
    >
      <h2 className="font-afh-display text-afh-h2 font-black text-afh-text">
        {hasRounds ? COPY_FR.heading : game.nameFr}
      </h2>

      {hasRounds ? (
        <>
          <p
            data-testid="game-score-value"
            className="font-afh-display text-afh-h3 font-black text-afh-text"
          >
            {correct} {COPY_FR.scoreSeparator} {total}
          </p>
          <p className="text-afh-body text-afh-text-soft">
            {COPY_FR.scoreCaption}
          </p>
          <p className="text-afh-body text-afh-text-soft">{game.nameFr}</p>
          <button
            type="button"
            onClick={onPlayAgain}
            className="min-h-11 w-full rounded-afh-lg px-4 py-2 font-medium"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            {COPY_FR.playAgain}
          </button>
        </>
      ) : (
        <div data-testid="game-score-empty" className="flex flex-col gap-2">
          <p className="text-afh-body text-afh-text">{COPY_FR.emptyCorpus}</p>
          <p className="text-afh-small text-afh-text-soft">
            {COPY_FR.emptyCorpusHint}
          </p>
        </div>
      )}
    </div>
  );
};

export default GameScoreCard;

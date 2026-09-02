"use client";

import { ScaleFactCard } from "@/components/play/ScaleFactCard";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import type { ScaleFact } from "@/lib/games/scaleFacts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COPY_FR = {
  heading: "Partie terminée",
  scoreSeparator: "sur",
  scoreCaption: "réponses exactes",
  playAgain: "Rejouer",
  factsHeading: "Tout ce que la carte cachait",
  corpusLimited:
    "Cette partie a été plus courte que prévu : les tracés ne fournissent pas encore assez de comparaisons trompeuses pour huit manches.",
  emptyCorpus:
    "Le corpus ne contient pas encore assez de fiches pour composer un tour de ce jeu.",
  emptyCorpusHint:
    "Ce jeu s'ouvrira quand les fiches correspondantes auront été publiées.",
} as const;

export interface GameScoreCardProps {
  game: GameDefinition;
  correct: number;
  total: number;
  /**
   * The whole measured bank, laid out once the session is over.
   *
   * This is the reading surface the page owes, and it is here rather than on
   * a route of its own: the reader who wants the facts is already at the end
   * of a session about them, and a separate page would be a second
   * destination competing for the same visit.
   */
  facts?: ScaleFact[];
  /**
   * True when the corpus yielded fewer rounds than the game asked for. The
   * handler has always computed this; the page used to drop it on the floor,
   * so a short session looked like a complete one.
   */
  corpusLimited?: boolean;
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
  facts = [],
  corpusLimited = false,
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
          {corpusLimited ? (
            <p
              data-testid="game-score-corpus-limited"
              className="text-afh-small text-afh-text-soft"
            >
              {COPY_FR.corpusLimited}
            </p>
          ) : null}
          <Button
            type="button"
            variant="accent"
            onClick={onPlayAgain}
            // min-h on top of the primitive's fixed h-11: a floor survives a
            // label that wraps, where a fixed height clips it.
            className="min-h-11 w-full"
          >
            {COPY_FR.playAgain}
          </Button>
        </>
      ) : (
        <div data-testid="game-score-empty" className="flex flex-col gap-2">
          <p className="text-afh-body text-afh-text">{COPY_FR.emptyCorpus}</p>
          <p className="text-afh-small text-afh-text-soft">
            {COPY_FR.emptyCorpusHint}
          </p>
        </div>
      )}

      {/*
        The score is the pretext and the facts are the lesson - charter 7
        makes that point about a round reveal, and the end of a session is
        where it matters most. A card stopping at "5 sur 8" would send the
        reader away with a number about themselves instead of one about the
        continent.
      */}
      {facts.length > 0 ? (
        <section
          data-testid="game-score-facts"
          className="flex w-full flex-col gap-3 border-t border-afh-border pt-4 text-center md:text-left"
        >
          <h3 className="font-afh-display text-afh-h3 font-bold text-afh-text">
            {COPY_FR.factsHeading}
          </h3>
          {facts.map((fact) => (
            <ScaleFactCard key={fact.id} fact={fact} />
          ))}
        </section>
      ) : null}
    </div>
  );
};

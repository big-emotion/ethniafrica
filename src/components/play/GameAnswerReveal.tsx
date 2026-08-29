"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { GameRound } from "@/lib/games/gameKinds";
import { revealProvenanceFr } from "@/lib/games/revealProvenance";
import { sourceStandingLabelFr } from "@/types/sources";
import { cn } from "@/lib/utils";

const COPY_FR = {
  correctVerdict: "Bonne réponse",
  incorrectVerdict: "Ce n'est pas ça",
  provenanceLabel: "D'après",
  openFiche: "Lire la fiche",
  confidenceAriaSuffix: "pour le sujet de cette manche",
  nextRound: "Tour suivant",
  seeScore: "Voir le score",
} as const;

/**
 * Floor height of the panel. Exported so a caller can reserve the same space
 * under the answering state and keep the reveal from shifting the page.
 */
// @req REQ-120
export const GAME_REVEAL_MIN_HEIGHT_CLASS = "min-h-[18rem]";

export interface GameAnswerRevealProps {
  round: GameRound;
  isCorrect: boolean;
  isLastRound: boolean;
  onNext: () => void;
  className?: string;
}

/**
 * What the reader is shown after answering (REQ-120).
 *
 * `reveal.textFr` is printed exactly as the corpus holds it: FR65/FR66 forbid
 * a paraphrase as firmly as an invented option, so there is no summarising and
 * no clamping here. `reveal.fieldPath` still records where the claim was read,
 * but the player is told so in French — see `revealProvenance` for why the
 * path itself no longer reaches the page.
 */
// @req REQ-120
export const GameAnswerReveal = ({
  round,
  isCorrect,
  isLastRound,
  onNext,
  className,
}: GameAnswerRevealProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, [round]);

  const VerdictIcon = isCorrect ? CheckCircle2 : XCircle;
  // `strictNullChecks` is off, so a reveal built without a source list is a
  // runtime crash the compiler will not catch — and a crash here blanks the
  // whole game rather than one line. Same reason `ficheSourceLabel` exists.
  const sources = round.reveal.sources ?? [];
  const provenanceFr = revealProvenanceFr(round.reveal.fieldPath ?? "");

  return (
    <div
      data-testid="game-answer-reveal"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      style={reducedMotion ? { transitionDuration: "0.01ms" } : undefined}
      className={cn(
        GAME_REVEAL_MIN_HEIGHT_CLASS,
        "flex flex-col gap-4 rounded-afh-lg border border-afh-border bg-afh-surface p-4 opacity-100 transition-opacity duration-afh-base",
        className
      )}
    >
      <div data-testid="game-reveal-live-region" aria-live="polite">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className={cn(
            "flex items-center gap-2 font-afh-display text-afh-h2 font-black outline-none",
            isCorrect ? "text-afh-conf-high" : "text-afh-terracotta"
          )}
        >
          <VerdictIcon aria-hidden="true" className="h-6 w-6" />
          {isCorrect ? COPY_FR.correctVerdict : COPY_FR.incorrectVerdict}
        </h2>
        <p
          data-testid="game-reveal-text"
          className="mt-3 text-afh-body text-afh-text"
        >
          {round.reveal.textFr}
        </p>
      </div>

      <div
        data-testid="game-reveal-provenance"
        className="flex flex-col gap-2 border-t border-afh-border pt-3 text-afh-small text-afh-text-soft"
      >
        {provenanceFr ? (
          <p>
            {COPY_FR.provenanceLabel} {provenanceFr}.
          </p>
        ) : null}

        {/*
          Nothing is withheld for a weak source; the standing is stated. A
          round resting only on « Non vérifiée » is played and marked, exactly
          as a fiche is.
        */}
        {sources.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {sources.map((source) => (
              <li
                key={`${source.label}-${source.standing}`}
                className="flex flex-wrap items-center gap-2"
              >
                <span>{source.label}</span>
                <span className="rounded-full bg-afh-bg-warm px-2 py-0.5 text-afh-caption font-medium">
                  {sourceStandingLabelFr(source.standing)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {round.reveal.confidence ? (
          <ConfidenceChip
            variant="inline"
            id={`game-reveal-${round.subjectId}`}
            confidenceScore={round.reveal.confidence.score}
            sourceCount={round.reveal.confidence.sourceCount}
            lastHumanAuditAt={round.reveal.confidence.lastHumanAuditAt}
            ariaSuffix={COPY_FR.confidenceAriaSuffix}
          />
        ) : null}

        <a
          data-testid="game-reveal-fiche-link"
          href={round.reveal.ficheHref}
          className="self-start font-medium underline underline-offset-2"
        >
          {COPY_FR.openFiche}
        </a>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-auto min-h-11 w-full rounded-afh-lg px-4 py-2 font-medium"
        style={{
          backgroundColor: "var(--accent)",
          color: "var(--accent-foreground)",
        }}
      >
        {isLastRound ? COPY_FR.seeScore : COPY_FR.nextRound}
      </button>
    </div>
  );
};

export default GameAnswerReveal;

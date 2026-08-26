"use client";

import type { QuadRound } from "@/lib/games/gameKinds";
import { cn } from "@/lib/utils";

export interface QuadChoiceProps {
  round: QuadRound;
  onAnswer: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Four choices, every one of them read verbatim from the corpus (FR65/FR66).
 * One column on a 430px screen, two from `md` up — four side by side would
 * shrink each target below the thumb minimum on the width that matters most.
 */
// @req REQ-120
export const QuadChoice = ({
  round,
  onAnswer,
  disabled = false,
  className,
}: QuadChoiceProps) => {
  return (
    <section
      data-testid="quad-choice"
      aria-labelledby={`quad-choice-prompt-${round.subjectId}`}
      className={cn("flex flex-col gap-4", className)}
    >
      <h2
        id={`quad-choice-prompt-${round.subjectId}`}
        className="font-afh-display text-afh-h3 font-bold text-afh-text"
      >
        {round.promptFr}
      </h2>
      <div
        data-testid="quad-choice-options"
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
      >
        {round.options.map((option, index) => (
          <button
            key={option.labelFr}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(index)}
            className="min-h-11 w-full rounded-afh-lg border p-4 text-left text-afh-body font-medium text-afh-text transition-colors duration-afh-base disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "var(--accent-tint)",
            }}
          >
            {option.labelFr}
            {option.name?.exonym ? (
              <span className="ml-1 font-normal text-afh-text-soft">
                ({option.name.exonym})
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuadChoice;

"use client";

import type { BinaryRound } from "@/lib/games/gameKinds";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/shared";

export interface BinaryChoiceProps {
  round: BinaryRound;
  language?: Language;
  onAnswer: (index: 0 | 1) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The one-thumb gesture of the Jouer hub (REQ-120): two full-width choices,
 * answered by a single tap with no separate « valider » step — the quiz needs
 * that step because it scores a considered answer, a game round does not.
 *
 * An option's exonym rides inside the same button rather than as a heading:
 * `AutonymExonymHeading` is a heading component, and a heading nested in a
 * button would break the button's own accessible name.
 */
// @req REQ-120
export const BinaryChoice = ({
  round,
  language = "fr",
  onAnswer,
  disabled = false,
  className,
}: BinaryChoiceProps) => {
  const prompt =
    language === "en" ? (round.promptEn ?? round.promptFr) : round.promptFr;
  return (
    <section
      data-testid="binary-choice"
      aria-labelledby={`binary-choice-prompt-${round.subjectId}`}
      className={cn("flex flex-col gap-4", className)}
    >
      {/*
        The question is the section's only heading. It used to drop to h3
        whenever a round carried a stimulus naming its subject — the shape
        « Eux, ou les autres ? » needed. That game is retired and the
        surviving round names both its countries in its own options, so there
        is no subject line left for the question to sit under.
      */}
      <h2
        id={`binary-choice-prompt-${round.subjectId}`}
        className="font-afh-display text-afh-h3 font-bold text-afh-text"
      >
        {prompt}
      </h2>
      <div className="flex flex-col gap-3 md:flex-row">
        {round.options.map((option, index) => (
          <button
            key={option.labelFr}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(index as 0 | 1)}
            className="min-h-11 w-full rounded-afh-lg border p-4 text-afh-body font-medium text-afh-text transition-colors duration-afh-base disabled:cursor-not-allowed disabled:opacity-50 md:flex-1"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "var(--accent-tint)",
            }}
          >
            {language === "en"
              ? (option.labelEn ?? option.labelFr)
              : option.labelFr}
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

"use client";

import type { ListRound } from "@/lib/games/gameKinds";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/shared";

export interface ListChoiceProps {
  round: ListRound;
  language?: Language;
  onAnswer: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The four-way question of the Jouer hub (REQ-120): one stacked list, answered
 * by a single tap.
 *
 * Not `BinaryChoice` with a longer array, and the difference is the layout
 * rather than the type. Two options sit side by side above 720 px and read
 * well; four never can at any width the site supports — « République
 * démocratique du Congo » in a quarter column wraps to four lines, and charter
 * §9.1 gives the options the vertical space rather than taking it from them.
 * So the list stacks at every width, which is also what makes it scannable:
 * four sizes to rank are read down a column, not across a row.
 *
 * Everything else is deliberately identical to the pair — same button
 * treatment, same 44 px floor, same single tap with no « valider » step —
 * because to a reader this is the same gesture asked of more options, and a
 * second visual language for it would say otherwise.
 */
// @req REQ-120
export const ListChoice = ({
  round,
  language = "fr",
  onAnswer,
  disabled = false,
  className,
}: ListChoiceProps) => {
  const prompt =
    language === "en" ? (round.promptEn ?? round.promptFr) : round.promptFr;

  return (
    <section
      data-testid="list-choice"
      aria-labelledby={`list-choice-prompt-${round.subjectId}`}
      className={cn("flex flex-col gap-4", className)}
    >
      <h2
        id={`list-choice-prompt-${round.subjectId}`}
        className="font-afh-display text-afh-h3 font-bold text-afh-text"
      >
        {prompt}
      </h2>
      <div className="flex flex-col gap-3">
        {round.options.map((option, index) => (
          <button
            key={option.labelFr}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(index)}
            className="min-h-11 w-full rounded-afh-lg border p-4 text-afh-body font-medium text-afh-text transition-colors duration-afh-base disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "var(--accent-tint)",
            }}
          >
            {language === "en"
              ? (option.labelEn ?? option.labelFr)
              : option.labelFr}
          </button>
        ))}
      </div>
    </section>
  );
};

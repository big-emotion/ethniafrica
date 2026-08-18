"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import type {
  QuizSessionQuestionView,
  QuizOptionValue,
} from "@/api/v2/schemas/quiz";

const t = translations.fr.quiz;

interface QuizQuestionCardProps {
  question: QuizSessionQuestionView;
  selectedOption: number | null;
  onSelectOption: (optionIndex: number) => void;
  onValidate: () => void;
  className?: string;
}

function optionLabel(option: QuizOptionValue): string {
  return typeof option === "string" ? option : option.autonym;
}

function OptionText({ option }: { option: QuizOptionValue }) {
  if (typeof option === "string") return <span>{option}</span>;
  return (
    <span>
      {option.autonym}
      {option.exonym ? (
        <span className="ml-1 text-afh-text-soft">({option.exonym})</span>
      ) : null}
    </span>
  );
}

/**
 * Answering-state radiogroup (fieldset/legend, roving tabindex via the
 * existing Radix-backed `RadioGroup`) plus the « valider » submit — Enter
 * on the focused button completes the loop, Radix already provides arrow
 * navigation + Space selection over the options. No timer, no auto-advance.
 */
// @req REQ-103 FR67
export const QuizQuestionCard = ({
  question,
  selectedOption,
  onSelectOption,
  onValidate,
  className,
}: QuizQuestionCardProps) => {
  return (
    <form
      className={cn("space-y-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (selectedOption !== null) onValidate();
      }}
    >
      <fieldset>
        <legend className="mb-3 font-afh-display text-afh-h3 font-bold text-afh-text">
          {question.promptFr}
        </legend>
        <RadioGroup
          value={selectedOption !== null ? String(selectedOption) : undefined}
          onValueChange={(value) => onSelectOption(Number(value))}
          className="gap-3"
        >
          {question.optionsFr.map((option, index) => (
            <label
              key={index}
              htmlFor={`quiz-option-${question.templateId}-${index}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-afh-lg border border-afh-border bg-afh-surface p-3 text-afh-body text-afh-text"
            >
              <RadioGroupItem
                id={`quiz-option-${question.templateId}-${index}`}
                value={String(index)}
                aria-label={optionLabel(option)}
              />
              <OptionText option={option} />
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      <button
        type="submit"
        disabled={selectedOption === null}
        className="min-h-11 w-full rounded-afh-lg bg-afh-terracotta px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t.validate}
      </button>
    </form>
  );
};

export default QuizQuestionCard;

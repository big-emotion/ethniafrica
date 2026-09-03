"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import type {
  QuizSessionQuestionView,
  QuizOptionValue,
} from "@/api/v2/schemas/quiz";
import { Button } from "@/components/ui/button";

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

/** One card is on screen at a time, so a constant id is enough to bind them. */
const STIMULUS_ID = "quiz-stimulus";

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
      {/*
        The stimulus, on the rounds whose answer is the subject.

        Outside the <legend>, which stays the question: a legend names its
        group, and a 400-character paragraph set in bold display type is not a
        name. Tied to the fieldset by `aria-describedby` instead, so a screen
        reader hears the passage as context for the group rather than as a
        stray paragraph before it. Rendered as a <blockquote> because it is
        corpus text quoted verbatim, never paraphrased (games charter §7).
      */}
      {question.stimulusFr ? (
        <blockquote
          id={STIMULUS_ID}
          data-testid="quiz-stimulus"
          className="border-l-2 border-afh-border pl-4 text-afh-body italic text-afh-text-soft"
        >
          {question.stimulusFr}
        </blockquote>
      ) : null}
      <fieldset
        aria-describedby={question.stimulusFr ? STIMULUS_ID : undefined}
      >
        <legend className="mb-3 font-afh-display text-afh-h3 font-bold text-afh-text">
          {question.promptFr}
        </legend>
        {/*
          Two columns from 430px up, one below.

          The four options rendered in a single column at every width, under a
          stem and a progress row, is what pushed the last of them below the
          fold on a phone — and the games charter is explicit that when a round
          does not fit, the stage shrinks and the options are never what gets
          pushed off. Two columns halve the block's height for four short
          answers. `min-h-11` stays on each cell, so a target is still 44px tall
          (WCAG 2.5.8) whatever the column count, and `items-center` keeps a
          two-line answer's radio aligned with its first line.
        */}
        <RadioGroup
          value={selectedOption !== null ? String(selectedOption) : undefined}
          onValueChange={(value) => onSelectOption(Number(value))}
          className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2"
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
      <Button
        type="submit"
        disabled={selectedOption === null}
        className="w-full"
      >
        {t.validate}
      </Button>
    </form>
  );
};

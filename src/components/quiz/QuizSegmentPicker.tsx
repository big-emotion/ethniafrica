"use client";

import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import type { QuizSegmentView } from "@/api/v2/schemas/quiz";

const t = translations.fr.quiz;

interface QuizSegmentPickerProps {
  segments: QuizSegmentView[];
  onSelectSegment?: (segmentId: QuizSegmentView["id"]) => void;
}

function totalActiveQuestions(segment: QuizSegmentView): number {
  return segment.rungs.reduce((sum, rung) => sum + rung.activeQuestionCount, 0);
}

function questionCountLabel(count: number): string {
  return count === 1
    ? t.questionCountSingular
    : `${count} ${t.questionCountPlural}`;
}

// @req REQ-103 FR66 FR43
export const QuizSegmentPicker = ({
  segments,
  onSelectSegment,
}: QuizSegmentPickerProps) => {
  return (
    <div
      role="list"
      aria-label={t.pickerLabel}
      className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2 min-[800px]:grid-cols-3"
    >
      {segments.map((segment) => {
        const count = totalActiveQuestions(segment);
        const launchable = count > 0;

        return (
          <button
            key={segment.id}
            type="button"
            role="listitem"
            aria-label={segment.labelFr}
            disabled={!launchable}
            onClick={() => onSelectSegment?.(segment.id)}
            className={cn(
              "min-h-11 w-full rounded-afh-lg border border-afh-border bg-afh-surface p-4 text-left shadow-afh-1 transition-colors",
              launchable
                ? "cursor-pointer hover:border-primary hover:shadow-afh-2"
                : "cursor-not-allowed opacity-70"
            )}
          >
            <span className="block font-afh-display text-afh-h2 font-black text-afh-text">
              {segment.labelFr}
            </span>
            <span className="mt-1 block text-afh-small text-afh-text-soft">
              {launchable ? questionCountLabel(count) : t.comingSoon}
            </span>
          </button>
        );
      })}
    </div>
  );
};

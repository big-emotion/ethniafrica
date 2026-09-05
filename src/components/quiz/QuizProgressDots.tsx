import { cn } from "@/lib/utils";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

interface QuizProgressDotsProps {
  /** 1-based index of the question currently in view. */
  current: number;
  total: number;
  language: Language;
  className?: string;
}

/**
 * Text-first progress indicator: the dots are purely decorative
 * (aria-hidden), the visible « question n sur total » text carries the
 * same information for assistive tech and sighted users alike.
 */
// @req REQ-103 FR67
export const QuizProgressDots = ({
  current,
  total,
  language,
  className,
}: QuizProgressDotsProps) => {
  const t = getTranslation(language).quiz;
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        data-testid="quiz-progress-dots"
        aria-hidden="true"
        className="flex gap-1.5"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            data-active={index < current ? "true" : "false"}
            className={cn(
              "h-2 w-2 rounded-full",
              index < current ? "bg-afh-terracotta" : "bg-afh-border"
            )}
          />
        ))}
      </div>
      <p className="text-afh-small text-afh-text-soft">
        {t.questionProgressPrefix} {current} {t.questionProgressSeparator}{" "}
        {total}
      </p>
    </div>
  );
};

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { persistRungIfEarned } from "@/lib/quiz/rung-storage";
import type { QuizAudience } from "@/lib/quiz/segmentPolicy";

const t = translations.fr.quiz;

interface QuizScoreScreenProps {
  segment: QuizAudience;
  difficulty: number;
  correctCount: number;
  totalQuestions: number;
  onPlayAgain: () => void;
  className?: string;
}

/**
 * Finished-state screen (FR68): surfaces the final score and — client-side
 * only, no server write — advances the segment's rung in localStorage when
 * the session finished at >= 75% correct (rung-storage.ts owns the
 * threshold/keying/capping logic).
 */
// @req REQ-103 FR68
export const QuizScoreScreen = ({
  segment,
  difficulty,
  correctCount,
  totalQuestions,
  onPlayAgain,
  className,
}: QuizScoreScreenProps) => {
  const [advancedRung, setAdvancedRung] = React.useState<number | null>(null);

  React.useEffect(() => {
    setAdvancedRung(
      persistRungIfEarned(
        segment,
        difficulty,
        totalQuestions > 0 ? correctCount / totalQuestions : 0
      )
    );
  }, [segment, difficulty, correctCount, totalQuestions]);

  return (
    <div
      data-testid="quiz-score-screen"
      className={cn(
        "flex flex-col items-center gap-4 rounded-afh-lg border border-afh-border bg-afh-surface p-6 text-center",
        className
      )}
    >
      <h2 className="font-afh-display text-afh-h2 font-black text-afh-text">
        {t.scoreHeading}
      </h2>
      <p className="text-afh-body text-afh-text">
        <span className="font-black text-afh-h3">{correctCount}</span>{" "}
        {t.scoreFractionSeparator}{" "}
        <span className="font-black text-afh-h3">{totalQuestions}</span>
      </p>
      <p className="text-afh-body text-afh-text-soft">
        {advancedRung !== null ? t.rungAdvanced : t.rungNotAdvanced}
      </p>
      <button
        type="button"
        onClick={onPlayAgain}
        className="min-h-11 w-full rounded-afh-lg bg-afh-terracotta px-4 py-2 font-medium text-white"
      >
        {t.playAgain}
      </button>
    </div>
  );
};

export default QuizScoreScreen;

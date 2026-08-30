"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { scoreCardSearchParams } from "@/lib/quiz/scoreCardParams";
import { QuizSessionExit } from "@/components/quiz/QuizSessionExit";
import type { QuizScope } from "@/lib/quiz/quizScope";
import { getLocalizedRoute } from "@/lib/routing";
import { Button } from "@/components/ui/button";

const t = translations.fr.quiz;

interface QuizScoreScreenProps {
  scope: QuizScope;
  scopeLabelFr: string;
  correctCount: number;
  totalQuestions: number;
  /** The picker, for choosing a different track. */
  exitHref: string;
  className?: string;
}

/**
 * Finished-state screen.
 *
 * It no longer advances anything. The rung it used to persist in localStorage
 * was one step of a per-audience ladder (FR68), and with audiences retired the
 * ladder moved inside the session — eight rounds climbing the population
 * deciles of the track just played. There is nothing left to carry between
 * sessions, so nothing is written, and the screen offers the two things a
 * finished session actually leads to: the same track again, or a different one.
 */
// @req REQ-103 FR70
export const QuizScoreScreen = ({
  scope,
  scopeLabelFr,
  correctCount,
  totalQuestions,
  exitHref,
  className,
}: QuizScoreScreenProps) => {
  const shareHref = `${getLocalizedRoute("fr", "quiz")}/score?${scoreCardSearchParams(
    scope,
    correctCount,
    totalQuestions
  ).toString()}`;

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
      <p className="text-afh-body text-afh-text-soft">{scopeLabelFr}</p>
      <div className="flex w-full flex-col gap-2">
        <Button asChild className="w-full">
          <Link href={shareHref}>{t.seeScoreCard}</Link>
        </Button>
        <QuizSessionExit
          href={exitHref}
          label={t.backToPicker}
          className="w-full justify-center"
        />
      </div>
    </div>
  );
};

export default QuizScoreScreen;

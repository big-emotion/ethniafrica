"use client";

import * as React from "react";

import { useQuizSession } from "@/hooks/use-quiz-session";
import { QuizQuestionCard } from "@/components/quiz/QuizQuestionCard";
import { QuizAnswerReveal } from "@/components/quiz/QuizAnswerReveal";
import { QuizProgressDots } from "@/components/quiz/QuizProgressDots";
import { QuizScoreScreen } from "@/components/quiz/QuizScoreScreen";
import { QuizSessionExit } from "@/components/quiz/QuizSessionExit";
import type { QuizScope } from "@/lib/quiz/quizScope";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

const t = translations.fr.quiz;

interface QuizPlayIslandProps {
  scope: QuizScope;
  /** The content theme narrowing the track, or null for all of them. */
  theme?: string | null;
  scopeLabelFr: string;
  /** Where leaving the session lands — the picker, with no track selected. */
  exitHref: string;
  className?: string;
}

/**
 * Orchestrates one track's play loop: fetches the session for `scope`, then
 * routes answering / revealed / finished to their dedicated panels. Mounted
 * lazily via `next/dynamic` once a track is chosen (ETNI-1137).
 */
// @req REQ-103 FR67 FR71
export const QuizPlayIsland = ({
  scope,
  theme = null,
  scopeLabelFr,
  exitHref,
  className,
}: QuizPlayIslandProps) => {
  const session = useQuizSession({ scope, theme });

  if (session.status === "loading") {
    return (
      <p
        role="status"
        className={cn("text-afh-body text-afh-text-soft", className)}
      >
        {t.loadingSession}
      </p>
    );
  }

  if (session.status === "error") {
    return (
      <div className={cn("flex flex-col items-start gap-4", className)}>
        <p role="alert" className="text-afh-body text-afh-terracotta">
          {t.sessionError}
        </p>
        <QuizSessionExit href={exitHref} label={t.backToPicker} />
      </div>
    );
  }

  if (session.status === "finished") {
    return (
      <QuizScoreScreen
        scope={scope}
        scopeLabelFr={scopeLabelFr}
        correctCount={session.correctCount}
        totalQuestions={session.totalQuestions}
        exitHref={exitHref}
        className={className}
      />
    );
  }

  // The FR65 gate runs again at serve time, so a track the picker counted as
  // stocked can still compose to zero questions. Say so and offer the way
  // back — rendering nothing stranded the player on a blank page.
  if (!session.currentQuestion) {
    return (
      <div className={cn("flex flex-col items-start gap-4", className)}>
        <p role="status" className="text-afh-body text-afh-text-soft">
          {t.emptySession}
        </p>
        <QuizSessionExit href={exitHref} label={t.backToPicker} />
      </div>
    );
  }

  const isLastQuestion = session.currentIndex + 1 >= session.totalQuestions;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-afh-small text-afh-text-soft">
          {t.playingScopePrefix} <strong>{scopeLabelFr}</strong>
        </p>
        <QuizSessionExit href={exitHref} label={t.leaveSession} />
      </div>
      <QuizProgressDots
        current={session.currentIndex + 1}
        total={session.totalQuestions}
      />
      {session.status === "answering" ? (
        <QuizQuestionCard
          question={session.currentQuestion}
          selectedOption={session.selectedOption}
          onSelectOption={session.selectAnswer}
          onValidate={session.validate}
        />
      ) : (
        <QuizAnswerReveal
          question={session.currentQuestion}
          isCorrect={session.verdict ?? false}
          isLastQuestion={isLastQuestion}
          onNext={session.next}
        />
      )}
    </div>
  );
};

export default QuizPlayIsland;

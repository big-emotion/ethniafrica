"use client";

import * as React from "react";

import { useQuizSession } from "@/hooks/use-quiz-session";
import { QuizQuestionCard } from "@/components/quiz/QuizQuestionCard";
import { QuizAnswerReveal } from "@/components/quiz/QuizAnswerReveal";
import { QuizProgressDots } from "@/components/quiz/QuizProgressDots";
import { QuizScoreScreen } from "@/components/quiz/QuizScoreScreen";
import { getStoredRung } from "@/lib/quiz/rung-storage";
import { DIFFICULTY_RUNGES, type QuizAudience } from "@/lib/quiz/segmentPolicy";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

const t = translations.fr.quiz;

interface QuizPlayIslandProps {
  segment: QuizAudience;
  onExit: () => void;
  className?: string;
}

/**
 * Orchestrates one segment's play loop: fetches a session at the rung
 * pre-selected from localStorage (FR68), then routes answering / revealed /
 * finished to their dedicated panels. Meant to be mounted lazily via
 * `next/dynamic` once a segment is chosen (ETNI-1137).
 */
// @req REQ-103 FR67 FR68 FR71
export const QuizPlayIsland = ({
  segment,
  onExit,
  className,
}: QuizPlayIslandProps) => {
  const [difficulty] = React.useState(
    () => getStoredRung(segment) ?? DIFFICULTY_RUNGES[segment].min
  );
  const session = useQuizSession({ segment, difficulty });

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
      <p
        role="alert"
        className={cn("text-afh-body text-afh-terracotta", className)}
      >
        {t.sessionError}
      </p>
    );
  }

  if (session.status === "finished") {
    return (
      <QuizScoreScreen
        segment={segment}
        difficulty={difficulty}
        correctCount={session.correctCount}
        totalQuestions={session.totalQuestions}
        onPlayAgain={onExit}
        className={className}
      />
    );
  }

  // The FR65 gate runs again at serve time, so a rung the picker counted as
  // stocked can still compose to zero questions. Say so and offer the way
  // back — rendering nothing stranded the player on a blank page.
  if (!session.currentQuestion) {
    return (
      <div className={cn("flex flex-col items-start gap-4", className)}>
        <p role="status" className="text-afh-body text-afh-text-soft">
          {t.emptySession}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="min-h-11 rounded-afh-lg border border-afh-border bg-afh-surface px-4 text-afh-body text-afh-text transition-colors hover:border-primary"
        >
          {t.backToPicker}
        </button>
      </div>
    );
  }

  const isLastQuestion = session.currentIndex + 1 >= session.totalQuestions;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
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

"use client";

import * as React from "react";
import dynamic from "next/dynamic";

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

/**
 * Lazily, and the split is load-bearing rather than incidental: the wait
 * reaches both `AFRICA_LANDMASS_PATH` and the whole "Saviez-vous" bank, and
 * importing the continent alone already put the island 0.6 KB over the 15 KB
 * gzipped budget `scripts/quiz-bundle-size.ts` holds it to. Nothing is lost by
 * splitting it — the wait stays invisible for its first 300 ms whatever
 * happens (`LOADER_REVEAL_DELAY_MS`), which is longer than its own chunk takes
 * to arrive alongside the session request.
 */
const LazyQuizSessionWait = dynamic(
  () =>
    import("@/components/quiz/QuizSessionWait").then(
      (mod) => mod.QuizSessionWait
    ),
  { ssr: false }
);

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
    // The session is fetched client-side, so this wait is the island's own —
    // no route boundary can cover it, which is why it spent a release as the
    // one wait on the site showing a silhouette and nothing else.
    // `QuizSessionWait` gives it what every other wait gets: a fact, in the
    // Jouer accent. The band's reserved height is not redundant with the
    // loader's own — it holds the page open during the chunk's flight, before
    // there is a loader to hold it.
    return (
      <div
        data-testid="quiz-loading-band"
        className={className}
        style={{ minHeight: "min(52vh, 420px)" }}
      >
        <LazyQuizSessionWait />
      </div>
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

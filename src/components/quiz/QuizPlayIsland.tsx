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
 * Lazily, and the split is load-bearing rather than incidental: the loader
 * carries `AFRICA_LANDMASS_PATH`, and importing it directly put the island
 * 0.6 KB over the 15 KB gzipped budget `scripts/quiz-bundle-size.ts` holds it
 * to. Nothing is lost by splitting it — the figure stays invisible for its
 * first 300 ms whatever happens (`LOADER_REVEAL_DELAY_MS`), which is far
 * longer than its own chunk takes to arrive alongside the session request.
 */
const LazyAfricaTraceLoader = dynamic(
  () =>
    import("@/components/system/AfricaTraceLoader").then(
      (mod) => mod.AfricaTraceLoader
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
    // no route boundary can cover it, and a bare sentence on an empty page
    // was the whole screen for as long as it lasted. `AfricaTraceLoader`
    // carries the sentence for a screen reader and gives a sighted reader the
    // same coastline every other wait on the site draws. It paints nothing
    // for the first 300 ms, so a fast session still opens straight onto its
    // first question.
    return (
      <div
        data-testid="quiz-loading-band"
        className={className}
        style={{ minHeight: "min(52vh, 420px)" }}
      >
        <LazyAfricaTraceLoader label={t.loadingSession} />
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

export default QuizPlayIsland;

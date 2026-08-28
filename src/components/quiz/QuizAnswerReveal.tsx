"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { LazySourceChainSheet } from "@/components/source-transparency/SourceChainSheet.lazy";
import { SOURCE_TIER_LABELS_FR, toSourceTier } from "@/types/sources";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import type {
  QuizSessionQuestionView,
  QuizOptionValue,
} from "@/api/v2/schemas/quiz";

const t = translations.fr.quiz;

// @req REQ-103
export const QUIZ_REVEAL_MIN_HEIGHT_CLASS = "min-h-[22rem]";

const TIER_BADGE_LABELS = SOURCE_TIER_LABELS_FR;

function optionLabel(option: QuizOptionValue): string {
  return typeof option === "string" ? option : option.autonym;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

interface QuizAnswerRevealProps {
  question: QuizSessionQuestionView;
  isCorrect: boolean;
  isLastQuestion: boolean;
  onNext: () => void;
  className?: string;
}

/**
 * Revealed-state panel (FR68/FR71): verdict, correct answer, explanation and
 * source line, with a « ouvrir la chaîne de sources » trigger. The sheet is
 * built from the single source the session already carries per question —
 * there is no richer assertion payload to fetch, so `confidenceScore` is
 * left at 0 and `sourceCount` at 1 rather than inventing data (same
 * precedent as `RelationsListWithSourceSheet`).
 */
// @req REQ-103 FR68 FR71
export const QuizAnswerReveal = ({
  question,
  isCorrect,
  isLastQuestion,
  onNext,
  className,
}: QuizAnswerRevealProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, [question]);

  const verdictText = isCorrect ? t.correctVerdict : t.incorrectVerdict;
  const VerdictIcon = isCorrect ? CheckCircle2 : XCircle;
  const verdictColorClass = isCorrect
    ? "text-afh-conf-high"
    : "text-afh-terracotta";
  const tier = toSourceTier(question.source.tier);

  const motionStyle: React.CSSProperties = reducedMotion
    ? { transitionDuration: "0.01ms" }
    : {};

  return (
    <div
      data-testid="quiz-answer-reveal"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      style={motionStyle}
      className={cn(
        QUIZ_REVEAL_MIN_HEIGHT_CLASS,
        "flex flex-col gap-4 rounded-afh-lg border border-afh-border bg-afh-surface p-4 opacity-100 transition-opacity duration-afh-base",
        className
      )}
    >
      <div data-testid="quiz-reveal-live-region" aria-live="polite">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className={cn(
            "flex items-center gap-2 font-afh-display text-afh-h2 font-black outline-none",
            verdictColorClass
          )}
        >
          <VerdictIcon aria-hidden="true" className="h-6 w-6" />
          {verdictText}
        </h2>
        <p className="mt-2 text-afh-body text-afh-text">
          <span className="font-medium">{t.correctAnswerLabel}</span>
          {optionLabel(question.optionsFr[question.correctOption])}
        </p>
        <p className="mt-2 text-afh-body text-afh-text-soft">
          {question.explanationFr}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-afh-border pt-3 text-afh-small text-afh-text-soft">
        <span>{question.source.title}</span>
        {question.source.year ? <span>· {question.source.year}</span> : null}
        <span className="rounded-full bg-afh-bg-warm px-2 py-0.5 text-afh-caption font-medium">
          {TIER_BADGE_LABELS[tier]}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="self-start text-afh-small font-medium text-afh-terracotta underline underline-offset-2"
      >
        {t.openSourceChain}
      </button>

      <button
        type="button"
        onClick={onNext}
        className="mt-auto min-h-11 w-full rounded-afh-lg bg-afh-terracotta px-4 py-2 font-medium text-white"
      >
        {isLastQuestion ? t.seeScore : t.nextQuestion}
      </button>

      <LazySourceChainSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        assertion={{
          statement: question.promptFr,
          confidenceScore: 0,
          sourceCount: 1,
          lastHumanAuditAt: null,
        }}
        sources={[
          {
            id: question.assertionId,
            title: question.source.title,
            year: question.source.year ?? undefined,
            url: question.source.url ?? undefined,
            tier,
          },
        ]}
        anchorId={`quiz-${question.assertionId}`}
      />
    </div>
  );
};

export default QuizAnswerReveal;

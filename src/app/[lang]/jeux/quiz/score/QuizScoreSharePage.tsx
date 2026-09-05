"use client";

import * as React from "react";

import { QuizScoreCard } from "@/components/quiz/QuizScoreCard";
import { getLocalizedRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import { scoreCardSearchParams } from "@/lib/quiz/scoreCardParams";
import { quizScopeSearchParams, type QuizScope } from "@/lib/quiz/quizScope";
import type { Language } from "@/types/shared";

export interface QuizScoreSharePageProps {
  /** The locale the page was served in — the card composes URLs from it. */
  language: Language;
  scope: QuizScope;
  scopeLabelFr: string;
  correct: number;
  total: number;
}

function buildShareUrl(props: QuizScoreSharePageProps): string {
  const search = scoreCardSearchParams(props.scope, props.correct, props.total);
  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "";
  return `${origin}${getLocalizedRoute(props.language, "quiz")}/score?${search.toString()}`;
}

/**
 * Client-side glue for the stateless /fr/quiz/score page (FR70): wires the
 * « partager le score » action to the Web Share API, falling back to
 * clipboard copy + a polite aria-live confirmation. QuizScoreCard itself
 * stays presentational.
 */
// @req REQ-103 FR70
export const QuizScoreSharePage = (props: QuizScoreSharePageProps) => {
  const t = getTranslation(props.language).quiz;
  const [shareStatusMessage, setShareStatusMessage] = React.useState<
    string | null
  >(null);

  async function handleShare() {
    const url = buildShareUrl(props);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // user cancelled the native share sheet — nothing to surface
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareStatusMessage(t.copiedFeedback);
    } catch {
      // clipboard unavailable — no confirmation to show
    }
  }

  // « Rejouer » returns to the same track, not to the picker: a reader arriving
  // on a shared card is being invited to try that country or family, and
  // dropping them on an unfiltered quiz would lose the invitation.
  const quizPath = getLocalizedRoute(props.language, "quiz");
  const replaySearch = quizScopeSearchParams(props.scope).toString();

  return (
    <QuizScoreCard
      language={props.language}
      scopeLabelFr={props.scopeLabelFr}
      correct={props.correct}
      total={props.total}
      fiches={[]}
      playAgainHref={replaySearch ? `${quizPath}?${replaySearch}` : quizPath}
      onShare={handleShare}
      shareStatusMessage={shareStatusMessage}
    />
  );
};

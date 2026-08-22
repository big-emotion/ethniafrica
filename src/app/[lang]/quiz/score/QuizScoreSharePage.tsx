"use client";

import * as React from "react";

import { QuizScoreCard } from "@/components/quiz/QuizScoreCard";
import { getLocalizedRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";
import type { QuizAudience } from "@/lib/quiz/segmentPolicy";

const t = translations.fr.quiz;

export interface QuizScoreSharePageProps {
  segment: QuizAudience;
  correct: number;
  total: number;
  rung: number;
}

function buildShareUrl(props: QuizScoreSharePageProps): string {
  const search = new URLSearchParams({
    segment: props.segment,
    correct: String(props.correct),
    total: String(props.total),
    rung: String(props.rung),
  });
  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "";
  return `${origin}/fr/quiz/score?${search.toString()}`;
}

/**
 * Client-side glue for the stateless /fr/quiz/score page (FR70): wires the
 * « partager le score » action to the Web Share API, falling back to
 * clipboard copy + a polite aria-live confirmation. QuizScoreCard itself
 * stays presentational.
 */
// @req REQ-103 FR70
export const QuizScoreSharePage = (props: QuizScoreSharePageProps) => {
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

  return (
    <QuizScoreCard
      segment={props.segment}
      correct={props.correct}
      total={props.total}
      rung={props.rung}
      fiches={[]}
      playAgainHref={getLocalizedRoute("fr", "quiz")}
      onShare={handleShare}
      shareStatusMessage={shareStatusMessage}
    />
  );
};

export default QuizScoreSharePage;

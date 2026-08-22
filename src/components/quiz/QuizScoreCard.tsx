"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import type { QuizAudience } from "@/lib/quiz/segmentPolicy";

const t = translations.fr.quiz;

export interface QuizScoreCardFicheLink {
  id: string;
  name: string;
  href: string;
}

export interface QuizScoreCardProps {
  segment: QuizAudience;
  correct: number;
  total: number;
  rung: number;
  fiches?: QuizScoreCardFicheLink[];
  playAgainHref: string;
  onShare: () => void;
  shareStatusMessage?: string | null;
  className?: string;
}

/**
 * Calm, shareable score card (FR70, UX-DR27/34): no confetti, no emoji, no
 * exclamation marks anywhere in copy. Distinct from QuizScoreScreen — this
 * is the text-first, presentational surface reused by the stateless
 * /quiz/score page (the share behavior itself is wired by the caller).
 */
// @req REQ-103 FR70 UX-DR27 UX-DR34
export const QuizScoreCard = ({
  segment,
  correct,
  total,
  rung,
  fiches = [],
  playAgainHref,
  onShare,
  shareStatusMessage = null,
  className,
}: QuizScoreCardProps) => {
  return (
    <div
      data-testid="quiz-score-card"
      className={cn(
        "flex flex-col items-center gap-4 rounded-afh-lg border border-afh-border bg-afh-surface p-6 text-center",
        className
      )}
    >
      <h2 className="font-afh-display text-afh-h2 font-black text-afh-text">
        {t.scoreHeading}
      </h2>
      <p className="text-afh-body text-afh-text">
        <span className="font-black text-afh-h3">{correct}</span>{" "}
        {t.scoreCardExactAnswersSeparator}{" "}
        <span className="font-black text-afh-h3">{total}</span>
      </p>
      <p className="text-afh-body text-afh-text-soft">{t.segments[segment]}</p>
      <p className="text-afh-body text-afh-text-soft">
        {t.scoreCardRungLabel} {rung} {t.scoreCardRungSuffix}
      </p>
      {fiches.length > 0 ? (
        <ul className="flex w-full flex-col gap-2 text-left">
          {fiches.map((fiche) => (
            <li key={fiche.id}>
              <Link
                href={fiche.href}
                className="text-afh-body text-afh-terracotta underline"
              >
                {fiche.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex w-full flex-col gap-2">
        <Link
          href={playAgainHref}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-afh-lg bg-afh-terracotta px-4 py-2 font-medium text-white"
        >
          {t.playAgain}
        </Link>
        <button
          type="button"
          onClick={onShare}
          className="min-h-11 w-full rounded-afh-lg border border-afh-border px-4 py-2 font-medium text-afh-text"
        >
          {t.shareScoreLabel}
        </button>
        <p
          role="status"
          aria-live="polite"
          className="text-afh-body text-afh-text-soft"
        >
          {shareStatusMessage}
        </p>
      </div>
    </div>
  );
};

export default QuizScoreCard;

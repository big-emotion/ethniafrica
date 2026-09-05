"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { getTranslation } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import type { Language } from "@/types/shared";

export interface QuizScoreCardFicheLink {
  id: string;
  name: string;
  href: string;
}

export interface QuizScoreCardProps {
  /** The track's own name, resolved from the corpus — never read from the URL. */
  scopeLabelFr: string;
  correct: number;
  total: number;
  fiches?: QuizScoreCardFicheLink[];
  playAgainHref: string;
  onShare: () => void;
  shareStatusMessage?: string | null;
  language: Language;
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
  scopeLabelFr,
  correct,
  total,
  fiches = [],
  playAgainHref,
  onShare,
  shareStatusMessage = null,
  language,
  className,
}: QuizScoreCardProps) => {
  const t = getTranslation(language).quiz;

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
      <p className="text-afh-body text-afh-text-soft">{scopeLabelFr}</p>
      {fiches.length > 0 ? (
        <ul className="flex w-full flex-col gap-2 text-center md:text-left">
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
        {/* A link, but the primary action of the screen — so it wears the
            button (actions charter §4: starting another run is doing
            something, not going to read). asChild keeps it an anchor. */}
        <Button asChild className="w-full">
          <Link href={playAgainHref}>{t.playAgain}</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onShare}
          className="w-full"
        >
          {t.shareScoreLabel}
        </Button>
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

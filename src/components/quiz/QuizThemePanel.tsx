"use client";

import Link from "next/link";
import { forwardRef } from "react";

import { ActionLink } from "@/components/ui/ActionLink";
import { Button } from "@/components/ui/button";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import { cn } from "@/lib/utils";

export interface QuizThemePanelTheme {
  id: string;
  labelFr: string;
}

export interface QuizThemePanelProps {
  panelId: string;
  labelledById: string;
  /** Only the themes this track can actually fill. Never a greyed list. */
  themes: QuizThemePanelTheme[];
  /** `?pays=GHA` — the whole-track run, the same href the card itself carries. */
  wholeTrackHref: string;
  /** Builds `?pays=GHA&theme=croyances` for one theme. */
  themeHref: (themeId: string) => string;
  hintFr: string;
  wholeTrackLabelFr: string;
  closeLabelFr: string;
  onClose: () => void;
  className?: string;
}

/**
 * The themes a chosen track can fill, deployed under the card that was tapped.
 *
 * **A theme the track cannot fill is absent, not greyed.** That is the whole
 * point of the panel: the picker used to print a count beside every option and
 * say nothing about the pair, and 123 of the 486 country × theme pairs are dead
 * ends. Presence is the honest signal, and it is the same discipline the round
 * generators already follow — a round that cannot be filled is not generated.
 *
 * Shapes are the actions charter's, unchanged: the themes are chips (form D,
 * one value among several), « Jouer sans thème » is an action link (form A,
 * it goes somewhere), and « Fermer » is a button (form C, it does something).
 *
 * Knows nothing about how the track was chosen, so the globe lot can replace
 * the deck's list of cards and keep this file verbatim.
 */
// @req REQ-121
export const QuizThemePanel = forwardRef<HTMLDivElement, QuizThemePanelProps>(
  function QuizThemePanel(
    {
      panelId,
      labelledById,
      themes,
      wholeTrackHref,
      themeHref,
      hintFr,
      wholeTrackLabelFr,
      closeLabelFr,
      onClose,
      className,
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        id={panelId}
        role="group"
        aria-labelledby={labelledById}
        tabIndex={-1}
        data-testid={`quiz-theme-panel-${panelId}`}
        className={cn(
          "relative z-10 mt-3 flex flex-col gap-3 rounded-afh-lg border border-afh-border p-3",
          "motion-safe:animate-in motion-safe:fade-in",
          CHARTER_FOCUS_RING,
          className
        )}
      >
        <p className="text-afh-small text-afh-text-soft">{hintFr}</p>

        <ul className="flex list-none flex-wrap gap-2 p-0">
          {themes.map((theme) => (
            <li key={theme.id}>
              <Link
                href={themeHref(theme.id)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-3 py-1 text-afh-caption text-afh-text",
                  CHARTER_FOCUS_RING
                )}
                style={{ backgroundColor: "var(--accent-tint)" }}
              >
                {theme.labelFr}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ActionLink href={wholeTrackHref}>{wholeTrackLabelFr}</ActionLink>
          <Button type="button" variant="outline" onClick={onClose}>
            {closeLabelFr}
          </Button>
        </div>
      </div>
    );
  }
);

export default QuizThemePanel;

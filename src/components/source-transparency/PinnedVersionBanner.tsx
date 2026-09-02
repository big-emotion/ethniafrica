"use client";

import { useEffect, useState } from "react";

const COLLAPSED_KEY_PREFIX = "pinned-version-banner:collapsed:";

export type PinnedVersionBannerProps = {
  pinnedAt: string | null;
  versionTag: string;
  liveUrl: string;
  resolvedFlagsCount?: number;
};

function collapsedKey(liveUrl: string): string {
  return `${COLLAPSED_KEY_PREFIX}${liveUrl}`;
}

function readCollapsed(liveUrl: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(collapsedKey(liveUrl)) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(liveUrl: string, collapsed: boolean): void {
  if (typeof window === "undefined") return;

  try {
    if (collapsed) {
      window.localStorage.setItem(collapsedKey(liveUrl), "1");
    } else {
      window.localStorage.removeItem(collapsedKey(liveUrl));
    }
  } catch {
    // Storage can be disabled without preventing the local interaction.
  }
}

function normalizeVersionTag(versionTag: string): string {
  const withoutAt = versionTag.trim().replace(/^@/, "");
  const versionNumber = withoutAt.replace(/^v/i, "");
  return `@v${versionNumber}`;
}

function formatLongFrenchDate(pinnedAt: string | null): string | null {
  if (!pinnedAt) return null;

  const date = new Date(pinnedAt);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// @req REQ-019
export function PinnedVersionBanner({
  pinnedAt,
  versionTag,
  liveUrl,
  resolvedFlagsCount = 0,
}: PinnedVersionBannerProps) {
  const normalizedVersionTag = normalizeVersionTag(versionTag);
  const dateLabel = formatLongFrenchDate(pinnedAt);
  const hasResolvedFlags = resolvedFlagsCount > 0;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed(liveUrl));
  }, [liveUrl]);

  const toggleCollapsed = () => {
    const nextCollapsed = !collapsed;
    writeCollapsed(liveUrl, nextCollapsed);
    setCollapsed(nextCollapsed);
  };

  /**
   * Form B (actions charter §3): the expanded banner drops this link into the
   * middle of a sentence, so it is underlined and carries no arrow. It used
   * to grow one only in the collapsed state, which made a single link two
   * different shapes on one component — and an arrow mid-sentence breaks the
   * line, which is the whole reason form B exists.
   *
   * The earth ink is the source layer's own, not the surface accent.
   */
  const liveLink = (
    <a
      href={liveUrl}
      className="rounded-sm font-semibold text-afh-earth underline decoration-afh-border underline-offset-4 hover:text-afh-text focus:outline-none focus-visible:ring-2 focus-visible:ring-afh-earth"
    >
      {hasResolvedFlags && !collapsed
        ? "voir version vivante"
        : "voir la version vivante"}
    </a>
  );

  return (
    <aside
      role="region"
      aria-label="indicateur de version figée"
      data-pinned-banner
      className={`rounded-afh-md border border-afh-border bg-afh-bg-warm font-afh text-afh-small text-afh-text ${
        collapsed ? "ml-auto w-fit max-w-full px-2 py-1" : "px-3 py-2"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {collapsed ? (
          <>
            <span
              data-version-indicator
              className="rounded-afh-sm border border-afh-border bg-afh-surface px-2 py-1 font-semibold text-afh-earth"
            >
              {normalizedVersionTag}
            </span>
            <span className="min-w-0 flex-1">{liveLink}</span>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            {hasResolvedFlags ? (
              <>
                <p className="m-0">
                  Version figée
                  {dateLabel ? ` du ${dateLabel}` : ""} ({normalizedVersionTag})
                </p>
                <p className="m-0 mt-1 text-afh-text-soft">
                  Depuis cette version figée, {resolvedFlagsCount}{" "}
                  {resolvedFlagsCount === 1
                    ? "assertion a été corrigée"
                    : "assertions ont été corrigées"}{" "}
                  — {liveLink}
                </p>
              </>
            ) : (
              <p className="m-0">
                Version figée
                {dateLabel ? ` du ${dateLabel}` : ""} ({normalizedVersionTag}) ·{" "}
                {liveLink}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? "développer l’indicateur de version figée"
              : "réduire l’indicateur de version figée"
          }
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-afh-sm text-afh-h2 leading-none text-afh-text-soft hover:bg-afh-surface hover:text-afh-text focus:outline-none focus-visible:ring-2 focus-visible:ring-afh-earth"
        >
          <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
        </button>
      </div>
    </aside>
  );
}

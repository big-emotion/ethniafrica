/**
 * ClassificationBadge — surfaces the editorial `classification_status` enum
 * on people and language-family fiches (Story ETNI-178 / 0.21).
 *
 * Renders `null` when the status is nullish — no placeholder, no layout shift.
 * Clicking the badge sends the user to `/fr/doctrine#<status>` so they can
 * read the editorial doctrine that defines each status.
 *
 * Color tokens come from `src/styles/country-tokens.css`. Foreground tokens
 * are designed for WCAG AA contrast against the corresponding `*-bg` token.
 */

import * as React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { classificationLabels } from "@/lib/translations";
import type { ClassificationStatus } from "@/types/afrik";

interface ClassificationBadgeProps {
  status: ClassificationStatus | null | undefined;
  className?: string;
}

/**
 * Maps each enum value to its country-token color pair (foreground / background).
 * Keeping inline styles here lets the badge use CSS custom properties without
 * pulling in a tailwind safelist for every new status.
 */
const STATUS_COLORS: Record<ClassificationStatus, { fg: string; bg: string }> =
  {
    consensual: {
      fg: "var(--country-green)",
      bg: "var(--country-green-bg)",
    },
    contested: {
      // WCAG AA: darker than --country-gold to reach 4.5:1 on --country-gold-bg
      fg: "#7A5807",
      bg: "var(--country-gold-bg)",
    },
    "colonial-legacy": {
      fg: "var(--country-colonial)",
      bg: "var(--country-colonial-bg)",
    },
    reconstructive: {
      // WCAG AA: darker than --country-terracotta to reach 4.5:1 on --country-terracotta-bg
      fg: "#A03F1A",
      bg: "var(--country-terracotta-bg)",
    },
  };

export function ClassificationBadge({
  status,
  className,
}: ClassificationBadgeProps) {
  if (!status) {
    return null;
  }

  const labels = classificationLabels[status];
  const colors = STATUS_COLORS[status];

  return (
    <Link
      href={`/fr/doctrine#${status}`}
      title={labels.tooltip}
      aria-label={`${labels.label} — ${labels.tooltip}`}
      data-classification-status={status}
      className={cn(
        "inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full",
        className
      )}
    >
      <Badge
        variant="outline"
        className="border-transparent font-semibold"
        style={{
          backgroundColor: colors.bg,
          color: colors.fg,
        }}
      >
        {labels.label}
      </Badge>
    </Link>
  );
}

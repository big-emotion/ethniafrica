/**
 * ClassificationBadge — surfaces the editorial `classification_status` enum
 * on people and language-family fiches.
 *
 * Originally introduced in ETNI-178 (story 0.21). Refactored for ETNI-26
 * ("Source Transparency Fabric" / [1.6]) to enforce the refined ACs:
 *
 * - **No red, ever.** The previous `colonial-legacy` palette mapped to
 *   `--country-colonial` (#9B3030, a red). It now uses warm earth tones via
 *   `var(--afh-earth, var(--country-terracotta))` so when the AFH design
 *   tokens land in ETNI-21 the badge inherits them automatically.
 * - **French label + icon.** Color is never the sole signal — every variant
 *   pairs the FR label with a lucide-react icon (monochrome-safe). The icon
 *   carries `data-testid="classification-icon"` for downstream tests.
 * - **`consensual` renders null.** Consensual is the default editorial state;
 *   rendering it would be visual noise. The caller does not need a wrapper
 *   guard — this component owns the contract.
 * - **`doctrineSlug?` prop.** Lets callers pair the badge with a
 *   `DoctrineLinkCard` for the same doctrine entry. The badge itself does
 *   NOT render the card — adjacency is the caller's responsibility, keeping
 *   the dependency one-way. The slug is exposed via `data-doctrine-slug`
 *   so consumers and tests can verify pairing.
 *
 * The badge link always points to `/fr/doctrine#<status>`. The optional
 * `doctrineSlug` is a marker for adjacent UI, not a router target.
 */

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Landmark, Wrench, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { classificationLabels } from "@/lib/translations";
import type { ClassificationStatus } from "@/types/afrik";

interface ClassificationBadgeProps {
  status: ClassificationStatus | null | undefined;
  className?: string;
  /**
   * Slug of an adjacent doctrine entry, exposed via `data-doctrine-slug` for
   * callers that render a `DoctrineLinkCard` next to the badge. The badge
   * does not render the card itself — adjacency is the caller's job.
   */
  doctrineSlug?: string;
}

/**
 * Maps each visible enum value to its display config.
 *
 * `fg` / `bg` use CSS custom properties with a fallback chain so the badge
 * inherits the upcoming AFH tokens (ETNI-21) automatically while staying
 * functional today against the existing `--country-*` palette.
 *
 * Crucially: NO red. `colonial-legacy` now uses the same warm earth tone as
 * `reconstructive`, distinguished by the icon and the label.
 */
type StatusConfig = {
  fg: string;
  bg: string;
  Icon: LucideIcon;
};

const STATUS_CONFIG: Record<
  Exclude<ClassificationStatus, "consensual">,
  StatusConfig
> = {
  contested: {
    // Warm gold; darker than --country-gold to reach WCAG AA on --country-gold-bg.
    fg: "var(--afh-earth, #7A5807)",
    bg: "var(--afh-earth-bg, var(--country-gold-bg))",
    Icon: AlertTriangle,
  },
  "colonial-legacy": {
    // Warm earth — replaces the previous red #9B3030. Same hue family as
    // terracotta but slightly darker for contrast against the bg token.
    fg: "var(--afh-earth, #8A4A1F)",
    bg: "var(--afh-earth-bg, var(--country-terracotta-bg))",
    Icon: Landmark,
  },
  reconstructive: {
    // Warm terracotta — darker than --country-terracotta for WCAG AA on bg.
    fg: "var(--afh-terracotta, #A03F1A)",
    bg: "var(--afh-terracotta-bg, var(--country-terracotta-bg))",
    Icon: Wrench,
  },
};

export function ClassificationBadge({
  status,
  className,
  doctrineSlug,
}: ClassificationBadgeProps) {
  // `null` / `undefined` and `consensual` (the default editorial state) both
  // render nothing — no placeholder, no layout shift.
  if (!status || status === "consensual") {
    return null;
  }

  const labels = classificationLabels[status];
  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;

  return (
    <Link
      href={`/fr/doctrine#${status}`}
      title={labels.tooltip}
      aria-label={`${labels.label} — ${labels.tooltip}`}
      data-doctrine-slug={doctrineSlug}
      className={cn(
        "inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full",
        className
      )}
    >
      <Badge
        variant="outline"
        data-classification-status={status}
        className="gap-1.5 border-transparent font-semibold"
        style={{
          backgroundColor: config.bg,
          color: config.fg,
        }}
      >
        <Icon
          aria-hidden="true"
          data-testid="classification-icon"
          className="h-3.5 w-3.5 shrink-0"
        />
        <span>{labels.label}</span>
      </Badge>
    </Link>
  );
}

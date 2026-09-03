import { cn } from "@/lib/utils";
import { sourceStandingLabelFr, type SourceTier } from "@/types/sources";

type Standing = SourceTier | "needs_review";

interface SourceStandingBadgeProps {
  standing: Standing;
  className?: string;
}

/**
 * A source's authority, stated per source.
 *
 * Square, not a pill: `actions-charter.md` §6 gives radius 0 to the source
 * apparatus — "citations, tier marks, version banners" — because the sharp
 * corner says this is a document rather than an application. A pill would read
 * as a removable filter chip, which is the opposite of what a tier is.
 *
 * Neutral, not coloured. The four categorical accents already teach entity
 * kinds, and a fifth meaning on the same hues is a code a reader cannot learn.
 * The three tiers are also not a traffic light: the project's doctrine is that
 * nothing is forbidden and everything is labelled, so an unverified source is
 * published and readable, not warned about. Only `needs_review` differs in
 * dress — outlined rather than filled — because it is the absence of a tier
 * rather than one of them.
 */
// @req REQ-092
export function SourceStandingBadge({
  standing,
  className,
}: SourceStandingBadgeProps) {
  const awaitingReview = standing === "needs_review";

  return (
    <span
      data-source-standing={standing}
      className={cn(
        "inline-block shrink-0 rounded-none px-2 py-0.5 text-afh-eyebrow font-medium",
        awaitingReview
          ? "border border-afh-border text-afh-text-soft"
          : "bg-afh-bg-warm text-afh-text-soft",
        className
      )}
    >
      {sourceStandingLabelFr(standing)}
    </span>
  );
}

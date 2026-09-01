import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import {
  CHARTER_FOCUS_RING,
  CHARTER_HOVER_LIFT,
} from "@/components/ui/charter-motion";
import { cn } from "@/lib/utils";

export interface QuizTrackCardProps {
  /** Where the track starts. Always a query on the quiz path, never a bare route. */
  href: string;
  labelFr: string;
  /**
   * One line under the label. On a theme card this is a specimen of the
   * question the theme asks — the thing an `<option>` could never carry, and
   * the reason this surface is cards rather than a form.
   */
  hintFr?: string;
  testId?: string;
  className?: string;
  /**
   * Rendered inside the card, above the stretched link's overlay. The deck puts
   * its deployed theme panel here; everything else leaves it empty.
   */
  children?: ReactNode;
  /**
   * Set by the deck when the card deploys in place instead of navigating.
   * Spread onto the anchor, so this component never learns what deploying is.
   */
  linkProps?: Record<string, unknown>;
}

/**
 * One track, as a card whose whole surface is the link.
 *
 * The shape is `SearchResultCard`'s, and deliberately not a new one: `Card`
 * carries the charter's `rounded-afh-lg`, `CHARTER_HOVER_LIFT` is the one
 * tappable dress, and the anchor is stretched with `after:absolute` so the
 * 44 px target is the card rather than the words.
 *
 * No arrow. The actions charter gives the `→` to `ActionLink` alone, and a
 * card that is itself the link has no room for a second affordance — the
 * container already made the promise.
 */
// @req REQ-103 REQ-121
export const QuizTrackCard = ({
  href,
  labelFr,
  hintFr,
  testId,
  className,
  children,
  linkProps,
}: QuizTrackCardProps) => (
  <Card
    data-testid={testId}
    className={cn(
      "relative flex min-h-11 flex-col gap-1 p-4",
      CHARTER_HOVER_LIFT,
      "focus-within:shadow-[var(--afh-ring-focus)]",
      className
    )}
  >
    <span className="font-afh-display text-afh-body font-semibold text-afh-text">
      <Link
        href={href}
        className={cn(
          "after:absolute after:inset-0 after:content-['']",
          CHARTER_FOCUS_RING
        )}
        {...linkProps}
      >
        {labelFr}
      </Link>
    </span>
    {hintFr ? (
      <span className="text-afh-small text-afh-text-soft">{hintFr}</span>
    ) : null}
    {children}
  </Card>
);

export default QuizTrackCard;

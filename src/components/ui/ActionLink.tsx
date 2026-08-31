import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";

/**
 * Form A of the actions charter — a link that leaves the block it stands in.
 *
 * It exists because the arrow used to be written in eight places, each with
 * its own size, weight, underline state and hover behaviour, for one promise.
 * The audit behind docs/design/actions-charter.md counted seven spellings on
 * the home alone. This is the only component allowed to draw the arrow.
 *
 * Bare at rest on purpose: the arrow is the affordance, and it says what an
 * underline cannot — that the click leaves this block. The underline arrives
 * on hover and focus as confirmation, not as a second permanent signal.
 *
 * It never drops its label to save room. An arrow alone asks the reader to
 * guess the promise, which is exactly what the home's axis cards did below
 * 860 px before this component landed.
 */
export interface ActionLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  href: string;
  children: ReactNode;
}

const ACTION_LINK_CLASS = cn(
  "group inline-flex min-h-11 items-center gap-2 no-underline",
  "text-afh-small font-semibold text-[color:var(--accent-ink)]",
  // The rest state carries no underline; these two are the whole hover and
  // focus dress. `underline-offset-4` only takes effect once one of them does.
  "hover:underline focus-visible:underline underline-offset-4",
  CHARTER_FOCUS_RING
);

const ARROW_CLASS = cn(
  "motion-safe:transition-transform motion-safe:duration-[170ms]",
  "motion-safe:ease-[var(--afh-ease-out)]",
  "motion-safe:group-hover:translate-x-1",
  "motion-safe:group-focus-visible:translate-x-1"
);

// @req REQ-091
export function ActionLink({
  href,
  children,
  className,
  ...rest
}: ActionLinkProps) {
  const content = (
    <>
      {children}
      <span
        aria-hidden="true"
        data-testid="action-link-arrow"
        className={ARROW_CLASS}
      >
        →
      </span>
    </>
  );

  const classes = cn(ACTION_LINK_CLASS, className);

  /**
   * A hash target scrolls within the page the reader is already on. Handing
   * it to the client router would remount that page — the fiche panels point
   * at `#fiche` precisely so the reader does not lose their place.
   */
  if (href.startsWith("#")) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {content}
    </Link>
  );
}

export default ActionLink;

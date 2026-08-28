import Link from "next/link";

import { cn } from "@/lib/utils";

export interface QuizSessionExitProps {
  href: string;
  label: string;
  className?: string;
}

/**
 * The way out of a running session.
 *
 * There was none. A player who started a quiz could reach the picker again only
 * by finishing all eight questions or by using the browser's back button, and
 * with a track picker in front of the session that stops being a nuisance and
 * becomes a trap: choose the wrong country and you are held for eight rounds
 * about peoples you did not ask for.
 *
 * A link, not a button with a confirmation. Nothing is at stake — no score is
 * persisted, no streak is lost — so asking « êtes-vous sûr ? » would invent a
 * consequence to justify the dialog. It points at the picker, so leaving and
 * choosing again is one gesture rather than two.
 */
// @req REQ-103 FR67
export const QuizSessionExit = ({
  href,
  label,
  className,
}: QuizSessionExitProps) => (
  <Link
    href={href}
    data-testid="quiz-session-exit"
    className={cn(
      "inline-flex min-h-11 items-center rounded-afh-lg border border-afh-border bg-afh-surface px-4 text-afh-body text-afh-text transition-colors hover:border-primary",
      className
    )}
  >
    {label}
  </Link>
);

export default QuizSessionExit;

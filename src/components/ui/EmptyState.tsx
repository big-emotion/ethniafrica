import Link from "next/link";
import { StateMedallion } from "@/components/ui/StateMedallion";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

// The way out of a fruitless search, worded once. The home's hero panel offers
// the same escape in a space too small for this component's medallion, and two
// hand-written copies of one sentence is how the site ended up with three
// spellings of "no results" already.
// @req REQ-002
export const SEARCH_EMPTY_LINK_LABEL = "Parcourir les familles linguistiques";

interface EmptyStateProps {
  message: string;
  variant?: "default" | "search" | "failure";
  /** Only the search variant links out; a caller without a locale gets the site default. */
  lang?: Language;
  retryHref?: string;
  retryLabel?: string;
  children?: React.ReactNode;
}

// @req REQ-099 @req REQ-107
export function EmptyState({
  message,
  variant,
  lang = DEFAULT_LOCALE,
  retryHref,
  retryLabel,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[16rem] gap-4 px-6 py-10 bg-afh-bg-warm text-afh-text-soft text-center rounded-md">
      <StateMedallion />

      <p data-testid="state-copy" className="text-afh-small max-w-sm">
        {message}
      </p>

      {variant === "search" && (
        <div className="flex flex-col gap-2 text-afh-small text-afh-text-soft">
          <p>
            Vérifiez l&apos;orthographe ou parcourez par famille linguistique.
          </p>
          <Link
            href={getLocalizedRoute(lang, "families")}
            data-cta="primary"
            className="underline underline-offset-2 hover:text-afh-text transition-colors"
          >
            {SEARCH_EMPTY_LINK_LABEL}
          </Link>
        </div>
      )}

      {variant === "failure" && retryHref && (
        <Link
          href={retryHref}
          data-testid="retry"
          data-cta="retry"
          className="underline underline-offset-2 hover:text-afh-text transition-colors"
        >
          {retryLabel ?? "Réessayer"}
        </Link>
      )}

      {children}
    </div>
  );
}

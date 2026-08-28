import Link from "next/link";
import { StateMedallion } from "@/components/ui/StateMedallion";

interface EmptyStateProps {
  message: string;
  variant?: "default" | "search" | "failure";
  lang?: string;
  retryHref?: string;
  retryLabel?: string;
  children?: React.ReactNode;
}

// @req REQ-099 @req REQ-107
export function EmptyState({
  message,
  variant,
  lang = "fr",
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
            href={`/${lang}/familles`}
            data-cta="primary"
            className="underline underline-offset-2 hover:text-afh-text transition-colors"
          >
            Parcourir les familles linguistiques
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

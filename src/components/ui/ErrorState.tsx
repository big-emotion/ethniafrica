"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StateMedallion } from "@/components/ui/StateMedallion";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";

interface ErrorStateProps {
  errorRef: string;
  onRetry: () => void;
  anecdote?: DidYouKnowFact | null;
}

// @req REQ-099
export function ErrorState({
  errorRef,
  onRetry,
  anecdote = null,
}: ErrorStateProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorRef);
    } catch {
      // fallback: select text in input
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-afh-bg-warm px-4 py-10 md:px-6 md:py-12">
      <div className="flex w-full max-w-xl flex-col items-center gap-5 text-center md:gap-6">
        <StateMedallion />

        <h2 className="text-afh-h2 font-display font-semibold text-afh-text">
          Une erreur est survenue
        </h2>

        <p data-testid="state-copy" className="max-w-md text-afh-text-soft">
          Une erreur inattendue s&apos;est produite. Vous pouvez réessayer ou
          contacter le support avec la référence ci-dessous.
        </p>

        <div
          data-testid="error-reference-actions"
          className="flex w-full max-w-sm flex-col items-stretch gap-2 md:w-auto md:max-w-none md:flex-row md:items-center"
        >
          <code className="overflow-x-auto rounded border border-afh-border bg-afh-bg px-3 py-1.5 text-center font-mono text-afh-small text-afh-text-soft">
            {errorRef}
          </code>
          <Button
            className="w-full md:w-auto"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label="Copier la référence"
          >
            {copied ? "Copié" : "Copier la référence"}
          </Button>
        </div>

        <Button onClick={onRetry} data-cta="primary">
          Réessayer
        </Button>

        {anecdote ? (
          <aside
            aria-label="Le saviez-vous"
            data-testid="error-anecdote"
            className="mt-2 w-full border-t border-afh-border pt-5 text-left md:mt-4 md:pt-6"
          >
            <p className="text-afh-caption font-semibold uppercase tracking-[0.14em] text-afh-text-soft">
              Le saviez-vous ?
            </p>
            <p className="mt-2 font-display text-afh-h3 font-semibold leading-snug text-afh-text">
              {anecdote.headline}
            </p>
            {anecdote.body[0] ? (
              <p className="mt-2 text-afh-small leading-relaxed text-afh-text-soft">
                {anecdote.body[0]}
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

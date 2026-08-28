"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StateMedallion } from "@/components/ui/StateMedallion";

interface ErrorStateProps {
  errorRef: string;
  onRetry: () => void;
}

// @req REQ-099
export function ErrorState({ errorRef, onRetry }: ErrorStateProps) {
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
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 px-4 py-10 bg-afh-bg-warm">
      <StateMedallion />

      <h2 className="text-afh-h2 font-display font-semibold text-afh-text">
        Une erreur est survenue
      </h2>

      <p
        data-testid="state-copy"
        className="text-afh-text-soft text-center max-w-md"
      >
        Une erreur inattendue s&apos;est produite. Vous pouvez réessayer ou
        contacter le support avec la référence ci-dessous.
      </p>

      <div className="flex items-center gap-2">
        <code className="font-mono text-afh-small bg-afh-bg px-3 py-1.5 rounded border border-afh-border text-afh-text-soft">
          {errorRef}
        </code>
        <Button
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
    </div>
  );
}

"use client";

import { Copy } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

export interface ApiKeyRevealCardProps {
  label: string;
  apiKey: string;
  onDismiss: () => void;
}

/**
 * The raw key is only ever readable at creation time (matches
 * `keyService.createUserApiKey` — never persisted or logged past this
 * response). Once dismissed there is no way back short of revoking and
 * issuing a new one.
 */
// @req REQ-056
export function ApiKeyRevealCard({
  label,
  apiKey,
  onDismiss,
}: ApiKeyRevealCardProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [announcement, setAnnouncement] = React.useState("");

  function selectForManualCopy() {
    inputRef.current?.focus();
    inputRef.current?.select();
    setAnnouncement("sélectionner manuellement");
  }

  async function copyKey() {
    try {
      if (!navigator.clipboard?.writeText) {
        selectForManualCopy();
        return;
      }
      await navigator.clipboard.writeText(apiKey);
      setAnnouncement("copiée");
    } catch {
      selectForManualCopy();
    }
  }

  return (
    <section
      data-testid="api-key-reveal"
      aria-label={`Nouvelle clé ${label}`}
      className="rounded-afh-md border border-afh-border bg-afh-bg-warm p-afh-lg"
    >
      <p className="text-afh-small font-semibold text-afh-text">
        Nouvelle clé « {label} »
      </p>
      <p className="mt-afh-xs text-afh-caption text-afh-text-soft">
        Copiez cette clé maintenant — elle ne sera plus jamais affichée.
      </p>

      <div className="mt-afh-md flex flex-col gap-afh-sm md:flex-row">
        <input
          ref={inputRef}
          readOnly
          aria-label="Nouvelle clé API"
          value={apiKey}
          className="w-full flex-1 rounded-afh-sm border border-afh-border bg-afh-surface px-afh-md py-afh-sm font-mono text-afh-small text-afh-text"
        />
        <Button type="button" onClick={copyKey}>
          <Copy aria-hidden="true" />
          Copier
        </Button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-afh-xs min-h-4 text-afh-caption text-afh-earth"
      >
        {announcement}
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-afh-md"
        onClick={onDismiss}
      >
        J’ai copié la clé, la masquer
      </Button>
    </section>
  );
}

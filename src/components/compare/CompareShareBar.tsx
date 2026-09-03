"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export interface CompareShareBarProps {
  canonicalUrl: string;
  title: string;
}

// @req REQ-100
export function CompareShareBar({ canonicalUrl, title }: CompareShareBarProps) {
  const fieldId = React.useId();
  const [announcement, setAnnouncement] = React.useState("");
  const [showManualField, setShowManualField] = React.useState(false);
  const fieldRef = React.useRef<HTMLInputElement>(null);
  const canShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  async function handleShare() {
    await navigator.share?.({ url: canonicalUrl, title });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setShowManualField(false);
      setAnnouncement("copié");
    } catch {
      setShowManualField(true);
      setAnnouncement("sélectionner manuellement");
    }
  }

  React.useEffect(() => {
    if (showManualField) {
      fieldRef.current?.focus();
      fieldRef.current?.select();
    }
  }, [showManualField]);

  return (
    <div className="flex flex-col gap-afh-md font-afh">
      <div className="flex flex-wrap gap-afh-md">
        {canShare ? (
          <Button
            type="button"
            onClick={handleShare}
            className="min-h-11 min-w-11"
          >
            Partager
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="min-h-11 min-w-11"
        >
          Copier le lien
        </Button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-afh-caption font-semibold text-afh-earth"
      >
        {announcement}
      </p>

      {showManualField ? (
        <div className="flex flex-col gap-afh-xs">
          <label
            htmlFor={fieldId}
            className="text-afh-caption text-afh-text-soft"
          >
            sélectionner manuellement
          </label>
          <input
            ref={fieldRef}
            id={fieldId}
            type="text"
            readOnly
            value={canonicalUrl}
            aria-label="sélectionner manuellement"
            className="min-h-11 w-full rounded-afh-md border border-afh-border bg-afh-bg px-afh-lg text-afh-small text-afh-text outline-none focus-visible:ring-2 focus-visible:ring-afh-terracotta focus-visible:ring-offset-2"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  );
}

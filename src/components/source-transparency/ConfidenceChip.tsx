"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ConfidenceChip — L3 component (ETNI-25)
 *
 * Renders a tappable typographic pill at the end of an assertion:
 *   `X % · N sources · vérifié YYYY-MM-DD`
 *
 * - No emoji, no icon, no color alarm.
 * - 44×44 px tap target via wrapper padding (even when visual pill is smaller).
 * - One-shot subtle pulse on first render in a session (honors prefers-reduced-motion).
 * - Falls back to a "voir les sources" text link when any data field is missing.
 *
 * Tokens: uses `--afh-*` (ETNI-21) with `--country-*` fallback so this PR is
 * independent. `SourceChainSheet` (ETNI-27) is intentionally NOT imported —
 * callers wire the sheet via the `onOpen` callback.
 */

const SESSION_PULSE_KEY = "afh-chip-pulsed";

export type ConfidenceChipVariant = "inline" | "hero" | "contested";

export type ConfidenceChipProps = {
  confidenceScore: number | null;
  sourceCount: number | null;
  lastHumanAuditAt: string | null; // ISO date (YYYY-MM-DD or full ISO)
  variant?: ConfidenceChipVariant;
  onOpen?: () => void;
  ariaSuffix?: string;
};

function toIsoShortDate(value: string): string {
  // Keep the leading YYYY-MM-DD slice from any ISO string.
  return value.slice(0, 10);
}

function toLongFrenchDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ConfidenceChip({
  confidenceScore,
  sourceCount,
  lastHumanAuditAt,
  variant = "inline",
  onOpen,
  ariaSuffix,
}: ConfidenceChipProps) {
  const hasAllData =
    confidenceScore !== null &&
    confidenceScore !== undefined &&
    sourceCount !== null &&
    sourceCount !== undefined &&
    lastHumanAuditAt !== null &&
    lastHumanAuditAt !== undefined &&
    lastHumanAuditAt !== "";

  const [shouldPulse, setShouldPulse] = React.useState(false);

  React.useEffect(() => {
    if (!hasAllData) return;
    if (typeof window === "undefined") return;
    try {
      const alreadyPulsed = window.sessionStorage.getItem(SESSION_PULSE_KEY);
      if (!alreadyPulsed) {
        setShouldPulse(true);
        window.sessionStorage.setItem(SESSION_PULSE_KEY, "1");
      }
    } catch {
      // sessionStorage may throw in private mode — silently degrade (no pulse).
    }
  }, [hasAllData]);

  // ---- Fallback: missing data → "voir les sources" text link.
  if (!hasAllData) {
    return (
      <span className="inline-flex items-center p-1">
        <a
          href="#sources"
          onClick={(event) => {
            if (onOpen) {
              event.preventDefault();
              onOpen();
            }
          }}
          className="text-sm underline underline-offset-2 text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))] hover:text-[color:var(--afh-text,var(--country-text,#2C2018))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--afh-focus,var(--country-text,#2C2018))]"
        >
          voir les sources
        </a>
      </span>
    );
  }

  const shortDate = toIsoShortDate(lastHumanAuditAt!);
  const longFrDate = toLongFrenchDate(lastHumanAuditAt!);
  const pillText = `${confidenceScore} % · ${sourceCount} sources · vérifié ${shortDate}`;

  const baseAriaLabel = `ouvrir la chaîne de sources pour cette assertion (confiance ${confidenceScore} %, ${sourceCount} sources, vérifiée le ${longFrDate})`;
  const ariaLabel = ariaSuffix
    ? `${baseAriaLabel} ${ariaSuffix}`
    : baseAriaLabel;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (onOpen) onOpen();
    }
  };

  // Variant-specific typographic distinction — NO red, NO alarm.
  // We only tune size, font-weight and emphasis. Colors stay neutral/earthy.
  const variantClasses: Record<ConfidenceChipVariant, string> = {
    inline:
      "text-xs font-medium tracking-tight text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]",
    hero: "text-sm font-semibold tracking-tight text-[color:var(--afh-text,var(--country-text,#2C2018))]",
    contested:
      "text-xs font-medium italic underline decoration-dotted underline-offset-4 text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]",
  };

  const pillBgClasses =
    "bg-[color:var(--afh-conf-bg,var(--country-card,#FFFFFF))] border border-[color:var(--afh-border,var(--country-border,#E8DFD3))]";

  return (
    <span className="afh-chip-wrapper inline-flex items-center align-baseline p-2 -m-2">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          if (onOpen) onOpen();
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          // Tap target: wrapper padding plus min sizing on the button itself.
          "inline-flex items-center justify-center min-h-[28px] min-w-[28px] px-2 py-1 rounded-full",
          "whitespace-nowrap select-none",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "focus-visible:ring-[color:var(--afh-focus,var(--country-text,#2C2018))]",
          pillBgClasses,
          variantClasses[variant],
          shouldPulse && "afh-chip-pulse"
        )}
        data-variant={variant}
      >
        <span className="afh-chip-text">{pillText}</span>
      </button>

      <style
        // Inline keyframes for the one-shot pulse. Kept minimal and scoped via the
        // `.afh-chip-pulse` class. `prefers-reduced-motion` neutralises the duration.
        dangerouslySetInnerHTML={{
          __html: `
@keyframes afhChipPulse {
  0% { box-shadow: 0 0 0 0 var(--afh-conf-pulse, rgba(184, 134, 11, 0.35)); }
  70% { box-shadow: 0 0 0 6px var(--afh-conf-pulse-fade, rgba(184, 134, 11, 0)); }
  100% { box-shadow: 0 0 0 0 var(--afh-conf-pulse-fade, rgba(184, 134, 11, 0)); }
}
.afh-chip-pulse {
  animation: afhChipPulse var(--afh-motion-pulse, 1200ms) ease-out 1;
}
@media (prefers-reduced-motion: reduce) {
  .afh-chip-pulse {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`,
        }}
      />
    </span>
  );
}

export default ConfidenceChip;

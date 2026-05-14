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
 * - 44×44 px tap target enforced directly on the button.
 * - One-shot subtle pulse on first render in a session, per-chip (honors prefers-reduced-motion).
 * - Falls back to a "voir les sources" text link when any data field is missing.
 *
 * Tokens: uses `--afh-*` (ETNI-21) with `--country-*` fallback so this PR is
 * independent. `SourceChainSheet` (ETNI-27) is intentionally NOT imported —
 * callers wire the sheet via the `onOpen` callback.
 */

const SESSION_PULSE_KEY = "afh-chip-pulsed-ids";
const KEYFRAMES_STYLE_ID = "afh-chip-keyframes";

export type ConfidenceChipVariant = "inline" | "hero" | "contested";

export type ConfidenceChipProps = {
  confidenceScore: number | null;
  sourceCount: number | null;
  lastHumanAuditAt: string | null;
  variant?: ConfidenceChipVariant;
  onOpen?: () => void;
  ariaSuffix?: string;
  id?: string;
};

function toIsoShortDate(value: string): string {
  return value.slice(0, 10);
}

function toLongFrenchDate(value: string): string {
  const isoDate = value.slice(0, 10);
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return value;
  }
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

function readPulsedIds(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(SESSION_PULSE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return new Set(parsed.filter((v) => typeof v === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function writePulsedIds(ids: Set<string>): void {
  try {
    window.sessionStorage.setItem(
      SESSION_PULSE_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // sessionStorage may throw in private mode — silently degrade.
  }
}

function ensureKeyframesInjected(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_STYLE_ID;
  style.textContent = `
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
`;
  document.head.appendChild(style);
}

export function ConfidenceChip({
  confidenceScore,
  sourceCount,
  lastHumanAuditAt,
  variant = "inline",
  onOpen,
  ariaSuffix,
  id,
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
    ensureKeyframesInjected();
    const pulseKey = id ?? "__default__";
    const seen = readPulsedIds();
    if (!seen.has(pulseKey)) {
      setShouldPulse(true);
      seen.add(pulseKey);
      writePulsedIds(seen);
    }
  }, [hasAllData, id]);

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
    <span className="afh-chip-wrapper inline-flex items-center align-baseline">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          if (onOpen) onOpen();
        }}
        className={cn(
          "inline-flex items-center justify-center p-3 min-h-[44px] min-w-[44px] rounded-full",
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
    </span>
  );
}

export default ConfidenceChip;

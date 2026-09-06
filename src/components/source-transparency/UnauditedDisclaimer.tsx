"use client";

import { useEffect, useState } from "react";

import { formatDate } from "@/lib/languageTag";
import type { Language } from "@/types/shared";
import { ficheCopy } from "@/lib/i18n/copy/fiche";

const STALE_THRESHOLD_MONTHS = 18;
const DISMISS_KEY_PREFIX = "unaudited-disclaimer:dismissed:";

export type UnauditedDisclaimerProps = {
  language: Language;
  /** ISO date string of the last human audit, or `null` if never audited. */
  lastHumanAuditAt: string | null;
  /** Fiche identifier (e.g. `PPL_YORUBA`, `FLG_BANTU`, `BFA`). Used as the
   *  per-fiche localStorage dismiss key. */
  fiche: string;
  /** Human-readable entity label appended to the region's aria-label so two
   *  instances rendered side by side (comparator, ETNI-485) stay distinct —
   *  axe-core's landmark-unique rule otherwise flags the duplicate. */
  entityLabel?: string;
};

function dismissKey(fiche: string): string {
  return `${DISMISS_KEY_PREFIX}${fiche}`;
}

function readDismissed(fiche: string): boolean {
  try {
    return window.localStorage.getItem(dismissKey(fiche)) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(fiche: string): void {
  try {
    window.localStorage.setItem(dismissKey(fiche), "1");
  } catch {
    // SSR or storage disabled — fail silently.
  }
}

function monthsBetween(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const days = to.getDate() - from.getDate();
  // Subtract one month if `to` hasn't yet reached the same day-of-month.
  return years * 12 + months - (days < 0 ? 1 : 0);
}

// Pinned to UTC: the audit stamp is date-only, and a reader west of
// Greenwich would otherwise see the day before.
const AUDIT_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
};

type Variant =
  { kind: "none" } | { kind: "never" } | { kind: "stale"; dateLabel: string };

function resolveVariant(
  language: Language,
  lastHumanAuditAt: string | null
): Variant {
  if (lastHumanAuditAt === null) {
    return { kind: "never" };
  }
  const audited = new Date(lastHumanAuditAt);
  if (Number.isNaN(audited.getTime())) {
    return { kind: "none" };
  }
  const months = monthsBetween(audited, new Date());
  if (months > STALE_THRESHOLD_MONTHS) {
    return {
      kind: "stale",
      dateLabel: formatDate(language, audited, AUDIT_DATE),
    };
  }
  return { kind: "none" };
}

// @req REQ-019
export function UnauditedDisclaimer({
  language,
  lastHumanAuditAt,
  fiche,
  entityLabel,
}: UnauditedDisclaimerProps) {
  const variant = resolveVariant(language, lastHumanAuditAt);

  // Initialise from localStorage synchronously so dismissed fiches never flash
  // the banner on mount.
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return readDismissed(fiche);
  });

  // Re-read on fiche change (e.g. when the component is re-used across pages).
  useEffect(() => {
    setDismissed(readDismissed(fiche));
  }, [fiche]);

  if (variant.kind === "none") return null;
  if (dismissed) return null;
  const copy = ficheCopy[language].auditDisclaimer;

  const message =
    variant.kind === "never" ? copy.never : copy.stale(variant.dateLabel);

  const handleDismiss = () => {
    writeDismissed(fiche);
    setDismissed(true);
  };

  const regionLabel = entityLabel
    ? `${copy.region} — ${entityLabel}`
    : copy.region;

  return (
    <div
      role="region"
      aria-label={regionLabel}
      className="flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-afh-small"
      style={{
        background: "var(--afh-bg-warm, var(--country-bg, #F5EDE0))",
        borderColor: "var(--country-border, #E8DFD3)",
        color: "var(--country-text, #2C2018)",
      }}
    >
      <p className="m-0">{message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={copy.close}
        className="shrink-0 rounded p-1 text-afh-small leading-none hover:opacity-70 focus:outline-none focus-visible:ring-2"
        style={{ color: "var(--country-text-soft, #7A6B5D)" }}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

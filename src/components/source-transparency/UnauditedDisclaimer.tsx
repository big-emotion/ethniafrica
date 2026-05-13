"use client";

import { useEffect, useState } from "react";

const STALE_THRESHOLD_MONTHS = 18;
const DISMISS_KEY_PREFIX = "unaudited-disclaimer:dismissed:";

export type UnauditedDisclaimerProps = {
  /** ISO date string of the last human audit, or `null` if never audited. */
  lastHumanAuditAt: string | null;
  /** Fiche identifier (e.g. `PPL_YORUBA`, `FLG_BANTU`, `BFA`). Used as the
   *  per-fiche localStorage dismiss key. */
  fiche: string;
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

function formatLongFrenchDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

type Variant =
  | { kind: "none" }
  | { kind: "never" }
  | { kind: "stale"; dateLabel: string };

function resolveVariant(lastHumanAuditAt: string | null): Variant {
  if (lastHumanAuditAt === null) {
    return { kind: "never" };
  }
  const audited = new Date(lastHumanAuditAt);
  if (Number.isNaN(audited.getTime())) {
    return { kind: "none" };
  }
  const months = monthsBetween(audited, new Date());
  if (months > STALE_THRESHOLD_MONTHS) {
    return { kind: "stale", dateLabel: formatLongFrenchDate(lastHumanAuditAt) };
  }
  return { kind: "none" };
}

export function UnauditedDisclaimer({
  lastHumanAuditAt,
  fiche,
}: UnauditedDisclaimerProps) {
  const variant = resolveVariant(lastHumanAuditAt);

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

  const message =
    variant.kind === "never"
      ? "fiche non auditée — lire avec précaution"
      : `dernière vérification : ${variant.dateLabel} · à re-vérifier`;

  const handleDismiss = () => {
    writeDismissed(fiche);
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="avertissement vérification"
      className="flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm"
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
        aria-label="fermer l'avertissement"
        className="shrink-0 rounded p-1 text-base leading-none hover:opacity-70 focus:outline-none focus-visible:ring-2"
        style={{ color: "var(--country-text-soft, #7A6B5D)" }}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export default UnauditedDisclaimer;

"use client";

import * as React from "react";
import type { RevisionItem } from "./RevisionDrawer";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface HistoriqueSectionProps {
  peopleId: string;
}

type SectionState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "success"; revisions: RevisionItem[] };

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const FR_LONG_DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

function formatLongFrenchDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return FR_LONG_DATE.format(d);
  } catch {
    return iso;
  }
}

async function fetchAllRevisions(peopleId: string): Promise<RevisionItem[]> {
  const res = await fetch(`/api/v2/peoples/${peopleId}/revisions?limit=100`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.data ?? []) as RevisionItem[];
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function HistoriqueSection({ peopleId }: HistoriqueSectionProps) {
  const [state, setState] = React.useState<SectionState>({ phase: "loading" });
  const fetchRef = React.useRef(0);

  const load = React.useCallback(async () => {
    const id = ++fetchRef.current;
    setState({ phase: "loading" });
    try {
      const revisions = await fetchAllRevisions(peopleId);
      if (id !== fetchRef.current) return;
      setState({ phase: "success", revisions });
    } catch {
      if (id !== fetchRef.current) return;
      setState({ phase: "error" });
    }
  }, [peopleId]);

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleId]);

  return (
    <section
      aria-labelledby="historique-heading"
      className="space-y-3 px-6 pb-6"
    >
      <h2
        id="historique-heading"
        className="text-sm font-semibold uppercase tracking-wide text-[var(--afh-fg-muted,#6b7280)]"
      >
        Historique
      </h2>

      {state.phase === "loading" && (
        <p
          data-testid="historique-loading"
          className="text-sm text-[var(--afh-fg-muted,#6b7280)]"
          aria-live="polite"
        >
          Chargement…
        </p>
      )}

      {state.phase === "error" && (
        <div
          className="space-y-2 rounded-md border border-[var(--afh-warn-fg,#92400e)]/30 bg-[var(--afh-warn-bg,#fef3c7)] p-3 text-sm text-[var(--afh-warn-fg,#92400e)]"
          role="alert"
        >
          <p>Impossible de charger l&apos;historique.</p>
          <button
            type="button"
            onClick={load}
            className="rounded bg-[var(--afh-warn-fg,#92400e)] px-3 py-1 text-xs font-medium text-white"
          >
            Réessayer
          </button>
        </div>
      )}

      {state.phase === "success" && state.revisions.length === 0 && (
        <p className="text-sm text-[var(--afh-fg-muted,#6b7280)]">
          Aucune révision publiée — fiche initiale
        </p>
      )}

      {state.phase === "success" && state.revisions.length > 0 && (
        <ol className="space-y-2">
          {state.revisions.map((rev) => (
            <li
              key={rev.version}
              data-testid={`historique-row-${rev.version}`}
              className="flex flex-wrap items-baseline gap-2 text-sm border-l-2 border-[var(--afh-border,#e5e7eb)] pl-3"
            >
              <a
                href={rev.pinned_url}
                className="font-semibold text-[var(--afh-accent,#1d4ed8)] underline underline-offset-2 hover:no-underline"
              >
                v{rev.version}
              </a>
              <time
                dateTime={rev.published_at ?? undefined}
                className="text-[var(--afh-fg-muted,#6b7280)]"
              >
                {formatLongFrenchDate(rev.published_at)}
              </time>
              {rev.moderator_pseudonym && (
                <span className="text-[var(--afh-fg-muted,#6b7280)]">
                  {rev.moderator_pseudonym}
                </span>
              )}
              {rev.reason && (
                <span className="text-[var(--afh-fg,#111827)] w-full text-xs">
                  {rev.reason}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

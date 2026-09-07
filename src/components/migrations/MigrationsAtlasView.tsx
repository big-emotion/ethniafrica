"use client";

/**
 * MigrationsAtlasView — the interactive "Carte" panel for `/fr/migrations`
 * (Epic 12, Story 12.9, ETNI-522/1101/1102). Composes the server-rendered
 * `AfricaBasemap` with client islands (`TimeScrubber`, `MigrationPathLayer`,
 * the event list and the dynamically-imported `MigrationDetailSheet`).
 *
 * Scrubber year (`?annee=`) and the selected event (`?migration=`) live in
 * the URL, not local state (ETNI-1102): every render derives them from
 * `useSearchParams()`, and every change goes through `router.push` so the
 * browser Back button — which Next.js App Router re-renders on via its own
 * popstate handling — restores the previous year/selection for free.
 */

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import { TimeScrubber } from "@/components/system/TimeScrubber";
import { MigrationPathLayer } from "@/components/migrations/MigrationPathLayer";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { getTranslation } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type {
  MigrationAtlasEntry,
  MigrationScrubberBounds,
} from "@/lib/migrationDataTransformer";
import type { Language } from "@/types/shared";

// Kept out of the initial bundle (module spec: the detail sheet is a
// below-the-fold enhancement, never required to read the map/list first).
const LazyMigrationDetailSheet = dynamic(
  () =>
    import("@/components/migrations/MigrationDetailSheet").then(
      (mod) => mod.MigrationDetailSheet
    ),
  { ssr: false }
);

export interface MigrationsAtlasViewProps {
  events: MigrationAtlasEntry[];
  scrubberBounds: MigrationScrubberBounds | null;
  language: Language;
  className?: string;
}

function clampYear(
  raw: string | null,
  bounds: MigrationScrubberBounds
): number {
  const parsed = raw !== null ? Number(raw) : NaN;
  const fallback = bounds.max;
  const value = Number.isNaN(parsed) ? fallback : parsed;
  return Math.min(Math.max(value, bounds.min), bounds.max);
}

// @req FR78 @req FR79 @req UX-DR10
// @req REQ-101
export function MigrationsAtlasView({
  events,
  scrubberBounds,
  language,
  className,
}: MigrationsAtlasViewProps) {
  const t = getTranslation(language).migrations;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const year = scrubberBounds
    ? clampYear(searchParams.get("annee"), scrubberBounds)
    : 0;

  const requestedId = searchParams.get("migration");
  const selectedEvent =
    events.find((event) => event.id === requestedId) ?? null;
  const selectedId = selectedEvent?.id ?? null;

  function pushParams(next: { annee?: number; migration?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.annee !== undefined) params.set("annee", String(next.annee));
    if (next.migration !== undefined) {
      if (next.migration) params.set("migration", next.migration);
      else params.delete("migration");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function selectEvent(id: string) {
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;
    pushParams({ migration: id });
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) pushParams({ migration: null });
  }

  React.useEffect(() => {
    if (!selectedId && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [selectedId]);

  if (events.length === 0 || !scrubberBounds) {
    return <p className={className}>{t.emptyState}</p>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <AfricaBasemap />
        <MigrationPathLayer
          events={events}
          year={year}
          selectedId={selectedId}
          onSelect={selectEvent}
        />
      </div>

      <TimeScrubber
        min={scrubberBounds.min}
        max={scrubberBounds.max}
        value={year}
        onChange={(nextYear) => pushParams({ annee: nextYear })}
      />

      <ul className="space-y-2" aria-label={t.pageTitle}>
        {events.map((event) => {
          const pressed = event.id === selectedId;
          return (
            <li key={event.id}>
              <button
                type="button"
                aria-pressed={pressed}
                data-testid={`migration-list-item-${event.id}`}
                onClick={() => selectEvent(event.id)}
                className={cn(
                  // Wraps, so the badge drops under the event's name rather
                  // than being pushed past the edge: at 200% text zoom the
                  // name and the status chip together outrun a 430px row, and
                  // `justify-between` with no wrap spends the excess on
                  // overflow — 461px of document inside a 430px viewport.
                  "flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-afh-small motion-safe:transition-colors",
                  pressed && "border-afh-atlas-path-selected font-semibold"
                )}
              >
                <span>{event.nameMain}</span>
                {/* The row is the control here, so the badge annotates it
                    rather than offering a second destination inside it. */}
                <ClassificationBadge
                  status={event.classificationStatus}
                  linksToDoctrine={false}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <LazyMigrationDetailSheet
        open={selectedEvent !== null}
        onOpenChange={handleSheetOpenChange}
        event={selectedEvent}
        language={language}
      />
    </div>
  );
}

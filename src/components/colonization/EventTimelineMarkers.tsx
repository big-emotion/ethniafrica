"use client";

/**
 * EventTimelineMarkers — Epic-13-owned marker layer beside Epic 12's
 * `TimeScrubber` on `/fr/regards/colonisation-et-resistances` (Story 13.12,
 * ETNI-536). `TimeScrubber` is rendered unmodified — its min/max/value/
 * onChange ARIA-slider contract is not extended here; markers are a
 * separate, independently focusable layer positioned along the same
 * [bounds.min, bounds.max] range.
 *
 * No auto-advance or scroll-triggered animation exists in this component
 * (module respects `prefers-reduced-motion: reduce` by never introducing
 * motion that would need to be suppressed).
 */

import * as React from "react";

import { TimeScrubber } from "@/components/system/TimeScrubber";
import { formatYearFr } from "@/lib/atlas/formatYearFr";
import { COLONIAL_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";
import type { ColonialEventType } from "@/lib/afrik/migrationEventTypes";
import type {
  ColonizationTimelineBounds,
  ColonizationTimelineEntry,
} from "@/lib/colonizationDataTransformer";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

/** The timeline's own copy, handed to the label helpers by the component. */
type TimelineCopy = ReturnType<
  typeof getTranslation
>["colonization"]["timeline"];

export interface EventTimelineMarkersProps {
  events: ColonizationTimelineEntry[];
  bounds: ColonizationTimelineBounds;
  language: Language;
  className?: string;
}

function peopleLabel(
  event: ColonizationTimelineEntry,
  t: TimelineCopy
): string {
  return event.peoples
    .map((people) => people.endonym ?? people.nameMain)
    .join(` ${t.peoplesJoiner} `);
}

function markerLabel(
  event: ColonizationTimelineEntry,
  t: TimelineCopy
): string {
  const parts = [
    // The noun has no dictionary key yet (the dictionary is not this
    // change's to extend); the type label beside it does follow the locale.
    `événement ${t.eventTypeLabels[event.eventType]}`,
    formatYearFr(event.timeRange.startYear),
    peopleLabel(event, t),
  ].filter(Boolean);
  return `${parts.join(", ")} — ${t.openEventSuffix}`;
}

function markerPosition(
  event: ColonizationTimelineEntry,
  bounds: ColonizationTimelineBounds
): number {
  const span = bounds.max - bounds.min;
  if (span <= 0) return 0;
  return ((event.timeRange.startYear - bounds.min) / span) * 100;
}

// @req FR87
// @req REQ-101
export function EventTimelineMarkers({
  events,
  bounds,
  language,
  className,
}: EventTimelineMarkersProps) {
  const t = getTranslation(language).colonization.timeline;
  const [activeTypes, setActiveTypes] = React.useState<Set<ColonialEventType>>(
    () => new Set(COLONIAL_EVENT_TYPES)
  );
  const [year, setYear] = React.useState(bounds.max);
  const [openEventId, setOpenEventId] = React.useState<string | null>(null);

  function toggleType(type: ColonialEventType) {
    setActiveTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const visibleEvents = events.filter((event) =>
    activeTypes.has(event.eventType)
  );
  const openEvent =
    visibleEvents.find((event) => event.id === openEventId) ?? null;

  return (
    <div className={className}>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-afh-small font-semibold">
          {t.filterLegend}
        </legend>
        {COLONIAL_EVENT_TYPES.map((type) => (
          <label key={type} className="flex items-center gap-1 text-afh-small">
            <input
              type="checkbox"
              checked={activeTypes.has(type)}
              onChange={() => toggleType(type)}
            />
            {t.eventTypeLabels[type]}
          </label>
        ))}
      </fieldset>

      <div className="relative mt-6">
        <TimeScrubber
          min={bounds.min}
          max={bounds.max}
          value={year}
          onChange={setYear}
        />
        {/* role="group": the strip names itself, and ARIA forbids aria-label
            on the generic role a bare div carries. */}
        <div className="relative mt-2 h-6" role="group" aria-label={t.title}>
          {visibleEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              aria-label={markerLabel(event, t)}
              aria-expanded={openEventId === event.id}
              onClick={() =>
                setOpenEventId(openEventId === event.id ? null : event.id)
              }
              style={{ left: `${markerPosition(event, bounds)}%` }}
              className="absolute top-0 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-afh-gold"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full bg-afh-terracotta"
              />
            </button>
          ))}
        </div>
      </div>

      {openEvent && (
        <div
          role="region"
          aria-labelledby={`timeline-event-${openEvent.id}-title`}
          className="mt-4 rounded-md border border-border p-4"
        >
          <h3
            id={`timeline-event-${openEvent.id}-title`}
            className="font-afh-display font-bold text-afh-h3"
          >
            {openEvent.nameMain}
          </h3>
          <p className="text-afh-small text-muted-foreground">
            {formatYearFr(openEvent.timeRange.startYear)}
            {openEvent.timeRange.endYear !== openEvent.timeRange.startYear &&
              ` – ${formatYearFr(openEvent.timeRange.endYear)}`}
          </p>
          {openEvent.peoples.length > 0 && (
            <p className="text-afh-small">{peopleLabel(openEvent, t)}</p>
          )}
          {openEvent.primarySource && (
            <a
              href={openEvent.primarySource.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-afh-small underline"
            >
              {openEvent.primarySource.title}
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpenEventId(null)}
            className="mt-2 text-afh-small underline"
          >
            {t.closeEventCard}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * EventChronologyTable — text-first equivalent of `EventTimelineMarkers`
 * (Epic 13, Story 13.12, ETNI-536). Always in the DOM, server-rendered, not
 * gated by any toggle — a semantic `<table>` works with or without JS and
 * carries the same information as the marker layer (date, type, people
 * endonym-first, place, source link).
 *
 * `place` is always "Non documenté": the migration_events data model has no
 * location field (only GeoJSON geometry), so this stays honestly undocumented
 * rather than deriving/inventing a place name from coordinates.
 */

import { formatYearFr } from "@/lib/atlas/formatYearFr";
import { getTranslation } from "@/lib/translations";
import type { ColonizationTimelineEntry } from "@/lib/colonizationDataTransformer";
import type { Language } from "@/types/shared";

/** The timeline's own copy, handed to the label helpers by the component. */
type TimelineCopy = ReturnType<
  typeof getTranslation
>["colonization"]["timeline"];

export interface EventChronologyTableProps {
  events: ColonizationTimelineEntry[];
  language: Language;
}

function peopleLabel(
  event: ColonizationTimelineEntry,
  t: TimelineCopy
): string {
  return event.peoples
    .map((people) => people.endonym ?? people.nameMain)
    .join(` ${t.peoplesJoiner} `);
}

// @req FR87
// @req REQ-101
export function EventChronologyTable({
  events,
  language,
}: EventChronologyTableProps) {
  const t = getTranslation(language).colonization.timeline;

  return (
    <table className="w-full border-collapse">
      <caption className="text-left text-afh-caption mb-2 text-muted-foreground">
        {t.table.caption}
      </caption>
      <thead>
        <tr>
          <th
            scope="col"
            className="text-left text-afh-caption font-semibold pb-2 pr-4"
          >
            {t.table.date}
          </th>
          <th
            scope="col"
            className="text-left text-afh-caption font-semibold pb-2 pr-4"
          >
            {t.table.type}
          </th>
          <th
            scope="col"
            className="text-left text-afh-caption font-semibold pb-2 pr-4"
          >
            {t.table.people}
          </th>
          <th
            scope="col"
            className="text-left text-afh-caption font-semibold pb-2 pr-4"
          >
            {t.table.place}
          </th>
          <th
            scope="col"
            className="text-left text-afh-caption font-semibold pb-2"
          >
            {t.table.source}
          </th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td className="py-2 pr-4 text-afh-small">
              {formatYearFr(event.timeRange.startYear)}
            </td>
            <td className="py-2 pr-4 text-afh-small">
              {t.eventTypeLabels[event.eventType]}
            </td>
            <td className="py-2 pr-4 text-afh-small">
              {peopleLabel(event, t)}
            </td>
            <td className="py-2 pr-4 text-afh-small">
              {event.place ?? t.table.placeUndocumented}
            </td>
            <td className="py-2 text-afh-small">
              {event.primarySource ? (
                <a
                  href={event.primarySource.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline"
                >
                  {event.primarySource.title}
                </a>
              ) : (
                t.table.sourceUndocumented
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

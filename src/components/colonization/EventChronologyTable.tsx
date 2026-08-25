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
import { translations } from "@/lib/translations";
import type { ColonizationTimelineEntry } from "@/lib/colonizationDataTransformer";

const t = translations.fr.colonization.timeline;

export interface EventChronologyTableProps {
  events: ColonizationTimelineEntry[];
}

function peopleLabel(event: ColonizationTimelineEntry): string {
  return event.peoples
    .map((people) => people.endonym ?? people.nameMain)
    .join(` ${t.peoplesJoiner} `);
}

// @req FR87
export function EventChronologyTable({ events }: EventChronologyTableProps) {
  return (
    <table className="w-full border-collapse">
      <caption className="text-left text-xs mb-2 text-muted-foreground">
        {t.table.caption}
      </caption>
      <thead>
        <tr>
          <th scope="col" className="text-left text-xs font-semibold pb-2 pr-4">
            {t.table.date}
          </th>
          <th scope="col" className="text-left text-xs font-semibold pb-2 pr-4">
            {t.table.type}
          </th>
          <th scope="col" className="text-left text-xs font-semibold pb-2 pr-4">
            {t.table.people}
          </th>
          <th scope="col" className="text-left text-xs font-semibold pb-2 pr-4">
            {t.table.place}
          </th>
          <th scope="col" className="text-left text-xs font-semibold pb-2">
            {t.table.source}
          </th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td className="py-2 pr-4 text-sm">
              {formatYearFr(event.timeRange.startYear)}
            </td>
            <td className="py-2 pr-4 text-sm">
              {t.eventTypeLabels[event.eventType]}
            </td>
            <td className="py-2 pr-4 text-sm">{peopleLabel(event)}</td>
            <td className="py-2 pr-4 text-sm">
              {event.place ?? t.table.placeUndocumented}
            </td>
            <td className="py-2 text-sm">
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

export default EventChronologyTable;

/**
 * MigrationEventCard — per-event header for the `/fr/migrations` Récit panel
 * (Epic 12, Story 12.8, ETNI-521). Renders name, period, phase indicator,
 * linked peoples and classification/confidence indicators. Does not render
 * narrative prose or debate text — that is MigrationNarrative's job.
 */

import Link from "next/link";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { getPeopleRoute } from "@/lib/routing";
import { formatYearFr } from "@/lib/atlas/formatYearFr";
import type {
  MigrationConfidenceData,
  MigrationNarrativeEntry,
} from "@/lib/migrationDataTransformer";

export interface MigrationEventCardProps {
  event: MigrationNarrativeEntry;
  confidence?: MigrationConfidenceData | null;
  className?: string;
}

function formatPeriod(timeRange: MigrationNarrativeEntry["timeRange"]): string {
  const start = formatYearFr(timeRange.startYear);
  const end = formatYearFr(timeRange.endYear);
  const range = `${start} – ${end}`;
  return timeRange.datingNote ? `${range} (${timeRange.datingNote})` : range;
}

// @req FR81 @req FR82
export function MigrationEventCard({
  event,
  confidence = null,
  className,
}: MigrationEventCardProps) {
  const titleId = `migration-event-${event.id}-title`;

  return (
    <article className={className} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3
          id={titleId}
          className="font-afh-display font-bold text-afh-h3 text-foreground"
        >
          {event.nameMain}
        </h3>
        <ClassificationBadge status={event.classificationStatus} />
      </div>

      <p className="text-sm text-muted-foreground">
        {formatPeriod(event.timeRange)}
      </p>

      {event.migrationGroup && (
        <p
          data-testid="migration-phase-indicator"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          {`Phase de la migration : ${event.migrationGroup}`}
        </p>
      )}

      <ConfidenceChip
        id={`${event.id}-confidence`}
        confidenceScore={confidence?.score ?? null}
        sourceCount={confidence?.sourceCount ?? null}
        lastHumanAuditAt={confidence?.lastHumanAuditAt ?? null}
        variant="hero"
      />

      {event.peoples.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-2">
          {event.peoples.map((people) => (
            <li key={people.id}>
              <Link href={getPeopleRoute("fr", people.id)}>
                <AutonymExonymHeading
                  variant="compact"
                  exonym={people.nameMain}
                  code={people.id}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default MigrationEventCard;

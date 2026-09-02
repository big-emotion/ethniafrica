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
  /**
   * Where the event sits in the page outline. The colonization page nests its
   * events under an h2 section, so h3 is right there and stays the default;
   * the migrations page puts them directly under its h1, where h3 would skip a
   * level. The tag changes, the type scale does not.
   */
  headingLevel?: 2 | 3;
}

function formatPeriod(timeRange: MigrationNarrativeEntry["timeRange"]): string {
  const start = formatYearFr(timeRange.startYear);
  const end = formatYearFr(timeRange.endYear);
  const range = `${start} – ${end}`;
  return timeRange.datingNote ? `${range} (${timeRange.datingNote})` : range;
}

// @req FR81 @req FR82
// @req REQ-101
export function MigrationEventCard({
  event,
  confidence = null,
  className,
  headingLevel = 3,
}: MigrationEventCardProps) {
  const titleId = `migration-event-${event.id}-title`;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className={className} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <Heading
          id={titleId}
          className="font-afh-display font-bold text-afh-h3 text-foreground"
        >
          {event.nameMain}
        </Heading>
        <ClassificationBadge status={event.classificationStatus} />
      </div>

      <p className="text-afh-small text-muted-foreground">
        {formatPeriod(event.timeRange)}
      </p>

      {event.migrationGroup && (
        <p
          data-testid="migration-phase-indicator"
          className="text-afh-eyebrow uppercase tracking-wide text-muted-foreground"
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
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

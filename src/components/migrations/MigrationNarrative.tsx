/**
 * MigrationNarrative — the complete, chronological Récit text (Epic 12,
 * Story 12.8, ETNI-521). Must be fully readable with JavaScript disabled
 * (FR78/FR81/FR82): every event's header (via MigrationEventCard), full
 * narrative prose with per-paragraph confidence indicators, and debate text
 * for contested events, all server-rendered.
 */

import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { translations } from "@/lib/translations";
import type { MigrationNarrativeEntry } from "@/lib/migrationDataTransformer";
import { MigrationEventCard } from "./MigrationEventCard";

const t = translations.fr.migrations;

export interface MigrationNarrativeProps {
  events: MigrationNarrativeEntry[];
  className?: string;
}

// @req FR78 @req FR81 @req FR82
// @req REQ-101
export function MigrationNarrative({
  events,
  className,
}: MigrationNarrativeProps) {
  if (events.length === 0) {
    return <p className={className}>{t.emptyState}</p>;
  }

  return (
    <div className={className}>
      {events.map((event) => {
        const eventConfidence = event.paragraphs[0]?.confidence ?? null;
        const showDebate =
          event.classificationStatus === "contested" && event.debate;

        return (
          <section
            key={event.id}
            className="border-b border-border pb-6 mb-6 last:border-b-0 last:mb-0 last:pb-0"
          >
            <MigrationEventCard
              event={event}
              confidence={eventConfidence}
              headingLevel={2}
            />

            {event.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-3 text-foreground">
                {paragraph.text}{" "}
                <ConfidenceChip
                  id={`${event.id}-paragraph-${index}`}
                  confidenceScore={paragraph.confidence?.score ?? null}
                  sourceCount={paragraph.confidence?.sourceCount ?? null}
                  lastHumanAuditAt={
                    paragraph.confidence?.lastHumanAuditAt ?? null
                  }
                  variant="inline"
                />
              </p>
            ))}

            {showDebate && (
              <div className="mt-4 rounded-md bg-muted p-4">
                <h3 className="font-afh-display font-semibold text-afh-small">
                  {t.debateLabel}
                </h3>
                <p className="mt-1 text-afh-small text-foreground">
                  {event.debate}
                </p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default MigrationNarrative;

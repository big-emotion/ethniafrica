/**
 * GazeEventNarrativeSection — chronological displacement/resistance event
 * narratives for the Gazes/colonization module (Epic 13, Story 13.11,
 * ETNI-535). Reuses Epic 12's `MigrationEventCard` for the per-event header
 * (name, period, peoples endonym-first, `ClassificationBadge`,
 * `ConfidenceChip`) since displacement/resistance are `migration_event_type`
 * values added on the same `migration_events` model (Story 13.1) — no
 * competing event header is duplicated here.
 */

import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { DoctrineLinkCard } from "@/components/source-transparency/DoctrineLinkCard";
import { MigrationEventCard } from "@/components/migrations/MigrationEventCard";
import type { MigrationNarrativeEntry } from "@/lib/migrationDataTransformer";
import type { MigrationEventType } from "@/types/migrations";

export type GazeEventType = Extract<
  MigrationEventType,
  "displacement" | "resistance"
>;

// UX-DR31 tone: calm, no invented content, no apology theater.
const EMPTY_STATE_COPY: Record<GazeEventType, string> = {
  displacement: "Aucun déplacement forcé n'est documenté pour le moment.",
  resistance: "Aucune résistance n'est documentée pour le moment.",
};

const DEBATE_LABEL = "Débat historiographique";

export interface GazeEventNarrativeSectionProps {
  eventType: GazeEventType;
  events: MigrationNarrativeEntry[];
  title: string;
  className?: string;
}

// @req FR87 @req FR89 @req FR90
// @req REQ-101
export function GazeEventNarrativeSection({
  eventType,
  events,
  title,
  className,
}: GazeEventNarrativeSectionProps) {
  const titleId = `gaze-event-narrative-${eventType}-title`;

  if (events.length === 0) {
    return (
      <section className={className} aria-labelledby={titleId}>
        <h2
          id={titleId}
          className="font-afh-display font-bold text-afh-h2 text-foreground"
        >
          {title}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {EMPTY_STATE_COPY[eventType]}
        </p>
      </section>
    );
  }

  const hasNonConsensualEvent = events.some(
    (event) => event.classificationStatus !== "consensual"
  );

  return (
    <section className={className} aria-labelledby={titleId}>
      <h2
        id={titleId}
        className="font-afh-display font-bold text-afh-h2 text-foreground"
      >
        {title}
      </h2>

      {events.map((event) => {
        const eventConfidence = event.paragraphs[0]?.confidence ?? null;
        const showDebate =
          event.classificationStatus === "contested" && event.debate;

        return (
          <div
            key={event.id}
            className="border-b border-border pb-6 mt-6 last:border-b-0 last:pb-0"
          >
            <MigrationEventCard event={event} confidence={eventConfidence} />

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
                  {DEBATE_LABEL}
                </h3>
                <p className="mt-1 text-afh-small text-foreground">
                  {event.debate}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {hasNonConsensualEvent && (
        <div className="mt-6">
          <DoctrineLinkCard slug="classifications-contestees" />
        </div>
      )}
    </section>
  );
}

export default GazeEventNarrativeSection;

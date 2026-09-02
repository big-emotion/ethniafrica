import type { PeopleOriginData } from "@/lib/peopleDataTransformer";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { ProseWithChip } from "./ProseWithChip";
import type { OriginChips } from "./ProseWithChip";

interface PeopleOriginBlockProps {
  data: PeopleOriginData;
  chips?: OriginChips;
  /** One note callout per sourced field, keyed as `chips` is. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
}

// @req REQ-003
export function PeopleOriginBlock({
  data,
  chips,
  notes,
}: PeopleOriginBlockProps) {
  const hasContent =
    data.ancientOrigins ||
    data.formationPeriod ||
    data.migrationRoutes.length > 0 ||
    data.historicalSettlementZones.length > 0 ||
    data.unificationsOrDivisions ||
    data.externalInfluences ||
    data.majorHistoricalEvents;

  if (!hasContent) return null;

  return (
    <dl className="afh-prose-fields space-y-[14px]">
      {data.ancientOrigins && (
        <div>
          <dt className="people-section-label">Origines anciennes</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.ancientOrigins}
              chip={chips?.ancientOrigins}
              note={notes?.ancientOrigins}
            />
          </dd>
        </div>
      )}

      {data.formationPeriod && (
        <div>
          <dt className="people-section-label">Période de formation</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.formationPeriod}
              chip={chips?.formationPeriod}
              note={notes?.formationPeriod}
            />
          </dd>
        </div>
      )}

      {data.migrationRoutes.length > 0 && (
        <div>
          <dt className="people-section-label">Routes migratoires</dt>
          <dd className="afh-prose-def">
            <ul className="space-y-[4px] mt-[4px]">
              {data.migrationRoutes.map((route, i) => (
                <li key={i} className="people-section-body flex gap-2">
                  <span className="opacity-40">→</span>
                  <span>{route}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}

      {data.historicalSettlementZones.length > 0 && (
        <div>
          <dt className="people-section-label">Zones de peuplement</dt>
          <dd className="afh-prose-def">
            <div className="flex flex-wrap gap-[6px] mt-[6px]">
              {data.historicalSettlementZones.map((zone, i) => (
                <span key={i} className="people-tag">
                  {zone}
                </span>
              ))}
            </div>
          </dd>
        </div>
      )}

      {data.unificationsOrDivisions && (
        <div>
          <dt className="people-section-label">Unifications &amp; divisions</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.unificationsOrDivisions}
              chip={chips?.unificationsOrDivisions}
              note={notes?.unificationsOrDivisions}
            />
          </dd>
        </div>
      )}

      {data.externalInfluences && (
        <div>
          <dt className="people-section-label">Influences extérieures</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.externalInfluences}
              chip={chips?.externalInfluences}
              note={notes?.externalInfluences}
            />
          </dd>
        </div>
      )}

      {data.majorHistoricalEvents && (
        <div>
          <dt className="people-section-label">Événements majeurs</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.majorHistoricalEvents}
              chip={chips?.majorHistoricalEvents}
              note={notes?.majorHistoricalEvents}
            />
          </dd>
        </div>
      )}
    </dl>
  );
}

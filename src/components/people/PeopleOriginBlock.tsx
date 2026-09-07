import type { PeopleOriginData } from "@/lib/peopleDataTransformer";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { ProseWithChip } from "./ProseWithChip";
import type { OriginChips } from "./ProseWithChip";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

interface PeopleOriginBlockProps {
  data: PeopleOriginData;
  chips?: OriginChips;
  /** One note callout per sourced field, keyed as `chips` is. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
  language?: Language;
}

// @req REQ-003
export function PeopleOriginBlock({
  data,
  chips,
  notes,
  language = FALLBACK_LOCALE,
}: PeopleOriginBlockProps) {
  const copy = peopleCopy[language].originFields;
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
          <dt className="people-section-label">{copy.ancientOrigins}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data.ancientOrigins}
              chip={chips?.ancientOrigins}
              note={notes?.ancientOrigins}
            />
          </dd>
        </div>
      )}

      {data.formationPeriod && (
        <div>
          <dt className="people-section-label">{copy.formationPeriod}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data.formationPeriod}
              chip={chips?.formationPeriod}
              note={notes?.formationPeriod}
            />
          </dd>
        </div>
      )}

      {data.migrationRoutes.length > 0 && (
        <div>
          <dt className="people-section-label">{copy.migrationRoutes}</dt>
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
          <dt className="people-section-label">{copy.settlementZones}</dt>
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
          <dt className="people-section-label">{copy.unifications}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data.unificationsOrDivisions}
              chip={chips?.unificationsOrDivisions}
              note={notes?.unificationsOrDivisions}
            />
          </dd>
        </div>
      )}

      {data.externalInfluences && (
        <div>
          <dt className="people-section-label">{copy.externalInfluences}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data.externalInfluences}
              chip={chips?.externalInfluences}
              note={notes?.externalInfluences}
            />
          </dd>
        </div>
      )}

      {data.majorHistoricalEvents && (
        <div>
          <dt className="people-section-label">{copy.majorEvents}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
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

import type { PeopleOriginData } from "@/lib/peopleDataTransformer";
import { ProseWithChip } from "./ProseWithChip";
import type { OriginChips } from "./ProseWithChip";

interface PeopleOriginBlockProps {
  data: PeopleOriginData;
  chips?: OriginChips;
}

export function PeopleOriginBlock({ data, chips }: PeopleOriginBlockProps) {
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
    <div className="space-y-[14px]">
      {data.ancientOrigins && (
        <div>
          <p className="people-section-label">Origines anciennes</p>
          <ProseWithChip
            text={data.ancientOrigins}
            chip={chips?.ancientOrigins}
          />
        </div>
      )}

      {data.formationPeriod && (
        <div>
          <p className="people-section-label">Période de formation</p>
          <ProseWithChip
            text={data.formationPeriod}
            chip={chips?.formationPeriod}
          />
        </div>
      )}

      {data.migrationRoutes.length > 0 && (
        <div>
          <p className="people-section-label">Routes migratoires</p>
          <ul className="space-y-[4px] mt-[4px]">
            {data.migrationRoutes.map((route, i) => (
              <li key={i} className="people-section-body flex gap-2">
                <span className="opacity-40">→</span>
                <span>{route}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.historicalSettlementZones.length > 0 && (
        <div>
          <p className="people-section-label">Zones de peuplement</p>
          <div className="flex flex-wrap gap-[6px] mt-[6px]">
            {data.historicalSettlementZones.map((zone, i) => (
              <span key={i} className="people-tag">
                {zone}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.unificationsOrDivisions && (
        <div>
          <p className="people-section-label">Unifications & divisions</p>
          <ProseWithChip
            text={data.unificationsOrDivisions}
            chip={chips?.unificationsOrDivisions}
          />
        </div>
      )}

      {data.externalInfluences && (
        <div>
          <p className="people-section-label">Influences extérieures</p>
          <ProseWithChip
            text={data.externalInfluences}
            chip={chips?.externalInfluences}
          />
        </div>
      )}

      {data.majorHistoricalEvents && (
        <div>
          <p className="people-section-label">Événements majeurs</p>
          <ProseWithChip
            text={data.majorHistoricalEvents}
            chip={chips?.majorHistoricalEvents}
          />
        </div>
      )}
    </div>
  );
}

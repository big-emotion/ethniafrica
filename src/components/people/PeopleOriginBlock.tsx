import type { PeopleOriginData } from "@/lib/peopleDataTransformer";

interface PeopleOriginBlockProps {
  data: PeopleOriginData;
}

export function PeopleOriginBlock({ data }: PeopleOriginBlockProps) {
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
          <p className="people-section-body">{data.ancientOrigins}</p>
        </div>
      )}

      {data.formationPeriod && (
        <div>
          <p className="people-section-label">Période de formation</p>
          <p className="people-section-body">{data.formationPeriod}</p>
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
          <p className="people-section-body">{data.unificationsOrDivisions}</p>
        </div>
      )}

      {data.externalInfluences && (
        <div>
          <p className="people-section-label">Influences extérieures</p>
          <p className="people-section-body">{data.externalInfluences}</p>
        </div>
      )}

      {data.majorHistoricalEvents && (
        <div>
          <p className="people-section-label">Événements majeurs</p>
          <p className="people-section-body">{data.majorHistoricalEvents}</p>
        </div>
      )}
    </div>
  );
}

import type { FamilyHistoryData } from "@/lib/familyDataTransformer";

export interface FamilyHistorySectionProps {
  data: FamilyHistoryData;
}

const historyFields = [
  ["Origine probable", "probableOrigin"],
  ["Période d'émergence", "emergencePeriod"],
  ["Diffusion", "diffusion"],
  ["Ruptures historiques", "historicalBreaks"],
  ["Zones de contact", "contactZones"],
  ["Événements majeurs", "majorEvents"],
] as const;

// @req REQ-047
export function FamilyHistorySection({ data }: FamilyHistorySectionProps) {
  if (!historyFields.some(([, field]) => Boolean(data[field]))) return null;

  return (
    <section aria-labelledby="family-history-heading">
      <h2 id="family-history-heading">Histoire et origines</h2>
      {historyFields.map(([label, field]) =>
        data[field] ? (
          <p key={field}>
            <strong>{label} :</strong> {data[field]}
          </p>
        ) : null
      )}
    </section>
  );
}

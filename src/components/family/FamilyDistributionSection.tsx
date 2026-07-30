import Link from "next/link";
import type { FamilyDistributionData } from "@/lib/familyDataTransformer";

export interface FamilyDistributionSectionProps {
  data: FamilyDistributionData;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

// @req REQ-047
export function FamilyDistributionSection({
  data,
}: FamilyDistributionSectionProps) {
  const entries = Object.entries(data.distributionByCountry);

  if (data.totalSpeakers === null && entries.length === 0) return null;

  return (
    <section aria-labelledby="family-distribution-heading">
      <h2 id="family-distribution-heading">Répartition géographique</h2>
      {data.totalSpeakers !== null && (
        <p>{formatNumber(data.totalSpeakers)} locuteurs</p>
      )}
      {entries.length > 0 && (
        <ul>
          {entries.map(([countryId, speakerCount]) => (
            <li key={countryId}>
              <Link href={`/fr/pays/${countryId}`}>{countryId}</Link>
              {": "}
              {formatNumber(speakerCount)} locuteurs
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import Link from "next/link";
import type { FamilyDistributionData } from "@/lib/familyDataTransformer";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import {
  classifyFieldProvenance,
  isStructurallyExpectedField,
} from "@/lib/fieldProvenance";

export interface FamilyDistributionSectionProps {
  data: FamilyDistributionData;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

// @req REQ-047
// @req REQ-119
export function FamilyDistributionSection({
  data,
}: FamilyDistributionSectionProps) {
  const entries = Object.entries(data.distributionByCountry);
  const footprintEntries = Object.entries(data.footprintByCountry);

  const distributionProvenance = isStructurallyExpectedField(
    "language-family",
    "distribution.distributionByCountry"
  )
    ? classifyFieldProvenance(data.distributionByCountry, {
        value: data.footprintByCountry,
        origin: "peuples rattachés à la famille",
      })
    : null;

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
      {distributionProvenance?.state === "missing" && (
        <FieldProvenanceMarker state="missing" />
      )}
      {distributionProvenance?.state === "derived" && (
        <>
          <FieldProvenanceMarker
            state="derived"
            origin={distributionProvenance.origin}
          />
          <ul>
            {footprintEntries.map(([countryId, peopleCount]) => (
              <li key={countryId}>
                <Link href={`/fr/pays/${countryId}`}>{countryId}</Link>
                {": "}
                {formatNumber(peopleCount)} peuples
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

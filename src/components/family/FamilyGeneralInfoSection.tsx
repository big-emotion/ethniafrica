import type { FamilyGeneralInfoData } from "@/lib/familyDataTransformer";
import { FamilyPeoplesSection } from "@/components/family/FamilyPeoplesSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import {
  classifyFieldProvenance,
  isStructurallyExpectedField,
} from "@/lib/fieldProvenance";

export interface FamilyGeneralInfoSectionProps {
  data: FamilyGeneralInfoData;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

// @req REQ-047
// @req REQ-119
export function FamilyGeneralInfoSection({
  data,
}: FamilyGeneralInfoSectionProps) {
  const branchesProvenance = isStructurallyExpectedField(
    "language-family",
    "generalInfo.branches"
  )
    ? classifyFieldProvenance(data.branches)
    : null;

  return (
    <section aria-labelledby="family-general-info-heading">
      <h2 id="family-general-info-heading">Informations générales</h2>
      {data.geographicArea && <p>{data.geographicArea}</p>}
      {data.numberOfLanguages !== null && (
        <p>{formatNumber(data.numberOfLanguages)} langues</p>
      )}
      {data.totalSpeakers !== null && (
        <p>{formatNumber(data.totalSpeakers)} locuteurs</p>
      )}
      {data.branches.length > 0 && <p>{data.branches.join(" · ")}</p>}
      {branchesProvenance && branchesProvenance.state === "missing" && (
        <FieldProvenanceMarker state="missing" />
      )}
      <FamilyPeoplesSection peoples={data.associatedPeoples} />
    </section>
  );
}

import type { FamilyGeneralInfoData } from "@/lib/familyDataTransformer";
import { FamilyPeoplesSection } from "@/components/family/FamilyPeoplesSection";

export interface FamilyGeneralInfoSectionProps {
  data: FamilyGeneralInfoData;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

// @req REQ-047
export function FamilyGeneralInfoSection({
  data,
}: FamilyGeneralInfoSectionProps) {
  const hasContent =
    data.branches.length > 0 ||
    Boolean(data.geographicArea) ||
    data.numberOfLanguages !== null ||
    data.totalSpeakers !== null ||
    data.associatedPeoples.length > 0;

  if (!hasContent) return null;

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
      <FamilyPeoplesSection peoples={data.associatedPeoples} />
    </section>
  );
}

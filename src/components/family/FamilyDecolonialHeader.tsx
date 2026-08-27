import type { FamilyDecolonialHeaderData } from "@/lib/familyDataTransformer";
import { DoctrineLinkCard } from "@/components/source-transparency/DoctrineLinkCard";
import { bcp47LanguageTag } from "@/lib/languageTag";

export interface FamilyDecolonialHeaderProps {
  data: FamilyDecolonialHeaderData;
  selfAppellationLang?: string;
}

const labelledFields = [
  ["Lien avec la famille", "linkWithFamily"],
  ["Origine du terme historique", "originOfHistoricalTerm"],
  ["Pourquoi ce terme est problématique", "whyProblematic"],
  ["Auto-appellation", "selfAppellation"],
  ["Usage contemporain", "contemporaryUsage"],
] as const;

// @req REQ-047
export function FamilyDecolonialHeader({
  data,
  selfAppellationLang,
}: FamilyDecolonialHeaderProps) {
  const hasContent =
    data.nameFr ||
    data.nameEn ||
    data.historicalAppellations.length > 0 ||
    labelledFields.some(([, field]) => Boolean(data[field]));

  if (!hasContent) return null;

  return (
    <section aria-labelledby="family-decolonial-heading">
      <h2 id="family-decolonial-heading">Appellations et décolonisation</h2>
      {data.nameFr && <p>{data.nameFr}</p>}
      {data.nameEn && <p>{data.nameEn}</p>}
      {data.historicalAppellations.length > 0 && (
        <p>{data.historicalAppellations.join(" · ")}</p>
      )}
      {labelledFields.map(([label, field]) => {
        const value = data[field];
        if (!value) return null;

        return (
          <p key={field}>
            <strong>{label} :</strong>{" "}
            {field === "selfAppellation" ? (
              <span lang={bcp47LanguageTag(selfAppellationLang)}>{value}</span>
            ) : (
              value
            )}
          </p>
        );
      })}
      {data.selfAppellation && (
        <div className="mt-3">
          <DoctrineLinkCard slug="endonymes-vs-exonymes" />
        </div>
      )}
      {data.whyProblematic && (
        <div className="mt-3">
          <DoctrineLinkCard slug="heritage-colonial" />
        </div>
      )}
    </section>
  );
}

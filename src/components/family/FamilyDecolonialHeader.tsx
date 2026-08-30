import type { FamilyDecolonialHeaderData } from "@/lib/familyDataTransformer";
import { DoctrineLinkCard } from "@/components/source-transparency/DoctrineLinkCard";
import { bcp47LanguageTag } from "@/lib/languageTag";

import { chapterAnchorId } from "@/lib/ficheChapters";

/** The chapter this section is, in the fiche's reading rail. */
const CHAPTER_TITLE = "Appellations et décolonisation";

export interface FamilyDecolonialHeaderProps {
  data: FamilyDecolonialHeaderData;
  selfAppellationLang?: string;
}

/**
 * Every field this section prints, with the label that says which it is.
 *
 * Three of them — nameFr, nameEn and the historical appellations — used to be
 * printed above the list as bare paragraphs, one after another, so the section
 * opened on three unlabelled names and the reader had to guess which was the
 * French one, which the English one and which the colonial-era ones. Naming
 * things is what this section is *for*.
 *
 * Two fields the data carries are deliberately not here:
 *
 * - `nameEn`, which the title band above the globe already states and labels.
 *   The band reads `hero.nameEn ?? decolonialHeader.nameEn`, so whenever this
 *   copy rendered at all it was the same string a second time.
 * - `originOfHistoricalTerm`, which the parchment gives a titled section of
 *   its own, "D'où vient le nom de la famille". That section is the one a
 *   reader can navigate to from the rail; a labelled line here said it again
 *   two chapters later.
 */
const labelledFields = [
  ["Nom français", "nameFr"],
  ["Lien avec la famille", "linkWithFamily"],
  ["Pourquoi ce terme est problématique", "whyProblematic"],
  ["Auto-appellation", "selfAppellation"],
  ["Usage contemporain", "contemporaryUsage"],
] as const;

// @req REQ-047
export function FamilyDecolonialHeader({
  data,
  selfAppellationLang,
}: FamilyDecolonialHeaderProps) {
  // Gated on what the section renders, never on what the data holds: counting
  // a field it does not print would open a heading over nothing.
  const hasContent =
    data.historicalAppellations.length > 0 ||
    labelledFields.some(([, field]) => Boolean(data[field]));

  if (!hasContent) return null;

  return (
    <section
      aria-labelledby="family-decolonial-heading"
      id={chapterAnchorId(CHAPTER_TITLE)}
      data-fiche-section={CHAPTER_TITLE}
    >
      <h2 id="family-decolonial-heading">{CHAPTER_TITLE}</h2>
      {data.historicalAppellations.length > 0 && (
        <p>
          <strong>Appellations historiques :</strong>{" "}
          {data.historicalAppellations.join(" · ")}
        </p>
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

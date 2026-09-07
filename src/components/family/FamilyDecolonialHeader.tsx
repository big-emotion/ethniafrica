import type { FamilyDecolonialHeaderData } from "@/lib/familyDataTransformer";
import { FicheFieldList } from "@/components/fiche/FicheProse";
import { DoctrineLinkCard } from "@/components/source-transparency/DoctrineLinkCard";
import { bcp47LanguageTag } from "@/lib/languageTag";
import { FALLBACK_LOCALE } from "@/lib/locale";
import { familyCopy } from "@/lib/i18n/copy/family";
import type { Language } from "@/types/shared";

import { chapterAnchorId } from "@/lib/ficheChapters";

/** The chapter this section is, in the fiche's reading rail. */
export interface FamilyDecolonialHeaderProps {
  data: FamilyDecolonialHeaderData;
  selfAppellationLang?: string;
  language?: Language;
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
// @req REQ-047
export function FamilyDecolonialHeader({
  data,
  selfAppellationLang,
  language = FALLBACK_LOCALE,
}: FamilyDecolonialHeaderProps) {
  const copy = familyCopy[language].decolonial;
  const labelledFields = [
    [copy.frenchName, "nameFr"],
    [copy.familyLink, "linkWithFamily"],
    [copy.problematic, "whyProblematic"],
    [copy.selfDesignation, "selfAppellation"],
    [copy.contemporaryUsage, "contemporaryUsage"],
  ] as const;
  // Gated on what the section renders, never on what the data holds: counting
  // a field it does not print would open a heading over nothing.
  const hasContent =
    data.historicalAppellations.length > 0 ||
    labelledFields.some(([, field]) => Boolean(data[field]));

  if (!hasContent) return null;

  return (
    <section
      aria-labelledby="family-decolonial-heading"
      id={chapterAnchorId(copy.title)}
      data-fiche-section={copy.title}
    >
      <h2 id="family-decolonial-heading">{copy.title}</h2>
      <FicheFieldList
        language={language}
        fields={[
          ...(data.historicalAppellations.length > 0
            ? [
                {
                  label: copy.historicalDesignations,
                  prose: data.historicalAppellations.join(" · "),
                },
              ]
            : []),
          // The tag qualifies the whole value, so it sits on the definition
          // rather than on a span inside it — which also keeps the paragraph a
          // single text node for the fields that carry no markup.
          ...labelledFields.flatMap(([label, field]) =>
            data[field]
              ? [
                  {
                    label,
                    prose: data[field],
                    lang:
                      field === "selfAppellation"
                        ? bcp47LanguageTag(selfAppellationLang)
                        : undefined,
                  },
                ]
              : []
          ),
        ]}
      />
      {data.selfAppellation && (
        <div className="mt-3">
          <DoctrineLinkCard slug="endonymes-vs-exonymes" language={language} />
        </div>
      )}
      {data.whyProblematic && (
        <div className="mt-3">
          <DoctrineLinkCard slug="heritage-colonial" language={language} />
        </div>
      )}
    </section>
  );
}

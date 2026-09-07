import { FicheFieldList } from "@/components/fiche/FicheProse";
import type { FamilyLinguisticTraitsData } from "@/lib/familyDataTransformer";
import { FALLBACK_LOCALE } from "@/lib/locale";
import { familyCopy } from "@/lib/i18n/copy/family";
import type { Language } from "@/types/shared";

import { chapterAnchorId } from "@/lib/ficheChapters";

/** The chapter this section is, in the fiche's reading rail. */
export interface FamilyLinguisticTraitsProps {
  data: FamilyLinguisticTraitsData;
  language?: Language;
}

// @req REQ-047
export function FamilyLinguisticTraits({
  data,
  language = FALLBACK_LOCALE,
}: FamilyLinguisticTraitsProps) {
  const copy = familyCopy[language].linguistic;
  const traitFields = [
    [copy.typology, "typology"],
    [copy.phonology, "phonologicalFeatures"],
    [copy.neighbours, "relationsWithNeighbors"],
    [copy.innovations, "keyInnovations"],
  ] as const;
  if (!traitFields.some(([, field]) => Boolean(data[field]))) return null;

  return (
    <section
      aria-labelledby="family-linguistic-traits-heading"
      id={chapterAnchorId(copy.title)}
      data-fiche-section={copy.title}
    >
      <h2 id="family-linguistic-traits-heading">{copy.title}</h2>
      <FicheFieldList
        language={language}
        fields={traitFields.flatMap(([label, field]) =>
          data[field] ? [{ label, prose: data[field] }] : []
        )}
      />
    </section>
  );
}

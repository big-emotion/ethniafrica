import { FicheFieldList } from "@/components/fiche/FicheProse";
import type { FamilyLinguisticTraitsData } from "@/lib/familyDataTransformer";

import { chapterAnchorId } from "@/lib/ficheChapters";

/** The chapter this section is, in the fiche's reading rail. */
const CHAPTER_TITLE = "Caractéristiques linguistiques";

export interface FamilyLinguisticTraitsProps {
  data: FamilyLinguisticTraitsData;
}

const traitFields = [
  ["Typologie", "typology"],
  ["Traits phonologiques", "phonologicalFeatures"],
  ["Relations avec les voisins", "relationsWithNeighbors"],
  ["Innovations majeures", "keyInnovations"],
] as const;

// @req REQ-047
export function FamilyLinguisticTraits({ data }: FamilyLinguisticTraitsProps) {
  if (!traitFields.some(([, field]) => Boolean(data[field]))) return null;

  return (
    <section
      aria-labelledby="family-linguistic-traits-heading"
      id={chapterAnchorId(CHAPTER_TITLE)}
      data-fiche-section={CHAPTER_TITLE}
    >
      <h2 id="family-linguistic-traits-heading">{CHAPTER_TITLE}</h2>
      <FicheFieldList
        fields={traitFields.flatMap(([label, field]) =>
          data[field] ? [{ label, prose: data[field] }] : []
        )}
      />
    </section>
  );
}

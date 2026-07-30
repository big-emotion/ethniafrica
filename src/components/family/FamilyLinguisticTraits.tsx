import type { FamilyLinguisticTraitsData } from "@/lib/familyDataTransformer";

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
    <section aria-labelledby="family-linguistic-traits-heading">
      <h2 id="family-linguistic-traits-heading">
        Caractéristiques linguistiques
      </h2>
      {traitFields.map(([label, field]) =>
        data[field] ? (
          <p key={field}>
            <strong>{label} :</strong> {data[field]}
          </p>
        ) : null
      )}
    </section>
  );
}

import type { LanguageFamily } from "@/types/afrik";
import { transformFamilyData } from "@/lib/familyDataTransformer";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { deriveTrail } from "@/lib/navigation/deriveTrail";
import { getFamilyRoute } from "@/lib/routing";

/** What a family fiche says a family is — see FamilyParchment. */
const FAMILY_TITLE_PREDICATE = "une aire à reconstruire";

/**
 * The band a family fiche opens on, above the globe.
 *
 * Same move as the people and country fiches. The chips — languages, derived
 * peoples and countries, the undeclared-distribution marker — stay with the
 * parchment: they are figures about the document, and they are what the
 * chapters below immediately qualify.
 */
// @req REQ-091
export function FamilyFicheTitle({ family }: { family: LanguageFamily }) {
  const { hero, decolonialHeader } = transformFamilyData(family);
  const selfAppellation = decolonialHeader.selfAppellation;
  const nameEn = hero.nameEn ?? decolonialHeader.nameEn;

  return (
    <>
      <AfrikBreadcrumbs
        items={deriveTrail(getFamilyRoute("fr", hero.id), hero.nameFr)}
      />

      <header className="afh-parchment-head">
        {/* The eyebrow says what kind of thing the reader has opened. It used
            to lead with the corpus identifier — FLG_ATLANTIQUE — which names
            the row in the database, not the family in the world. */}
        <p className="afh-parchment-eyebrow">Famille linguistique</p>
        <h1>
          {hero.nameFr}, <em>{FAMILY_TITLE_PREDICATE}</em>
        </h1>
        <p className="afh-parchment-lede">
          {/* Naming both when they are the same word would present one fact as
              two, and quietly overstate how much the fiche knows. */}
          {selfAppellation && nameEn && selfAppellation === nameEn
            ? `Auto-appellation et nom anglais : ${selfAppellation}. Le français seul francise.`
            : `Auto-appellation : ${selfAppellation ?? "non renseignée"}. Nom anglais : ${nameEn ?? "non renseigné"}.`}
        </p>
      </header>
    </>
  );
}

export default FamilyFicheTitle;

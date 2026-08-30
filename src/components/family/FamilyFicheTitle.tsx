import type { LanguageFamily } from "@/types/afrik";
import { transformFamilyData } from "@/lib/familyDataTransformer";
import { ClassificationBadge } from "@/components/ui/classification-badge";

/**
 * The second half of the fiche's title — what a family fiche says a family is.
 *
 * Not a corpus field. It is true of all 24 family fiches for the same
 * structural reason — none declares its own distribution — so storing it would
 * mean writing the same sentence into 24 files and keeping them in step. It
 * lives here, as one editorial constant, with its reason attached.
 *
 * The day a family fiche does declare a distribution, this stops being true of
 * that fiche and has to become conditional on the same provenance check the
 * parchment's stat cards already run.
 */
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

  // The trail is the shell's now (`PageLayout` → `SiteTrail`).
  return (
    <>
      <header className="afh-parchment-head">
        {/* The eyebrow says what kind of thing the reader has opened. It used
            to lead with the corpus identifier — FLG_ATLANTIQUE — which names
            the row in the database, not the family in the world. */}
        <p className="afh-parchment-eyebrow">Famille linguistique</p>
        <h1>
          {hero.nameFr}, <em>{FAMILY_TITLE_PREDICATE}</em>
        </h1>
        {/* 19 of the 24 families explain in prose that their name was imposed
            — Bantou was coined by Bleek and made an apartheid legal category —
            and the head could not say so as data. The badge stands alone under
            the name rather than opening a chip row: the chips are figures
            about the document and belong with the parchment, but a
            classification qualifies the name itself. */}
        <ClassificationBadge status={family.classificationStatus} />
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

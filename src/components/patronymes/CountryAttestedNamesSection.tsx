import type { CountryPatronymes } from "@/api/v2/services/patronymeFicheLinks";
import { FicheFieldList, type FicheField } from "@/components/fiche/FicheProse";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FicheNameList } from "@/components/patronymes/FicheNameList";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

export interface CountryAttestedNamesSectionProps {
  /** The country's two name lists, `null` when the read failed. */
  patronymes: CountryPatronymes | null;
  language: Language;
}

/**
 * « Noms attestés » — the names a country answers for (REQ-133).
 *
 * Two labelled lists in one chapter, never a sum. They assert different
 * things: the direct link says a source attests the name in this country, the
 * people route says the peoples who bear it live here. Neither contains the
 * other — 2 countries are reachable only directly (Ethiopia and Eritrea, whose
 * non-hereditary patronymics designate no group at all) and 6 only through
 * their peoples. `docs/design/name-to-country-linking.md` carries the argument.
 *
 * They are two `<dt>` fields rather than two sibling chapters for two reasons.
 * A `<dt>` is out of the document outline, so the fiche keeps the one heading
 * level there is under an `h2`; and on the ~50 country fiches where both lists
 * are empty, two sibling chapters would put two adjacent gap notices in the
 * reading rail and advertise the corpus as thinner than it is. One chapter
 * states the silence once.
 */
// @req REQ-133
export function CountryAttestedNamesSection({
  patronymes,
  language,
}: CountryAttestedNamesSectionProps) {
  const copy = getTranslation(language).patronymes.onFiche;

  if (patronymes === null) {
    return (
      <FicheSection title={copy.countryTitle}>
        <FieldProvenanceMarker
          state="documented-gap"
          reason={copy.countryUnavailable}
          language={language}
        />
      </FicheSection>
    );
  }

  const { attested, borneByPeoples } = patronymes;

  if (attested.length === 0 && borneByPeoples.length === 0) {
    return (
      <FicheSection title={copy.countryTitle}>
        <FieldProvenanceMarker
          state="documented-gap"
          reason={copy.countryEmpty}
          language={language}
        />
      </FicheSection>
    );
  }

  // An empty list drops its own label rather than printing a second gap
  // notice: the chapter has already stated what it holds, and a country whose
  // peoples add nothing is not owed a sentence about it.
  const fields: FicheField[] = [];
  if (attested.length > 0) {
    fields.push({
      label: copy.attestedLabel,
      node: <FicheNameList names={attested} language={language} />,
    });
  }
  if (borneByPeoples.length > 0) {
    fields.push({
      label: copy.reachLabel,
      node: <FicheNameList names={borneByPeoples} language={language} />,
    });
  }

  return (
    <FicheSection
      title={copy.countryTitle}
      // Only where both registers are on the page: with one list there is no
      // distinction to draw, and the note would name a second thing the
      // reader cannot see.
      note={fields.length > 1 ? copy.countryNote : undefined}
    >
      <FicheFieldList fields={fields} />
    </FicheSection>
  );
}

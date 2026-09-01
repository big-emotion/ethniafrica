import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheFieldList, type FicheField } from "@/components/fiche/FicheProse";
import { FicheSection } from "@/components/fiche/FicheSection";
import { PatronymeSourceCitation } from "@/components/patronymes/PatronymeSourceCitation";
import {
  readAttestedForms,
  readDesignatedSocialUnit,
  readNisbaSubtype,
  readPermittedGivenNames,
  readTotemicFoodProhibition,
  readTransmissionMode,
} from "@/lib/patronymes/content";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * AC1: states the naming system (in the header — `PatronymeFicheTitle`) and
 * renders only the fields belonging to it. The shared fields (attested
 * forms, transmission mode, designated social unit) render for every
 * system; the subtype-only fields are gated on `nameSystem` so a nisba
 * fiche never shows a totemic food prohibition and vice versa, even if the
 * opaque `content` bag happens to carry the other subtype's key.
 */
// @req REQ-133
export function PatronymeNamingSystemSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const { content, nameSystem, casteOrSocialFunction } = patronyme;

  const attestedForms = readAttestedForms(content);
  const transmissionMode = readTransmissionMode(content);
  const designatedSocialUnit = readDesignatedSocialUnit(content);

  const isTotemicClan = nameSystem === "totemic_clan";
  const isNisba = nameSystem === "nisba";

  const totemicFoodProhibition = isTotemicClan
    ? readTotemicFoodProhibition(content)
    : null;
  const permittedGivenNames = isTotemicClan
    ? readPermittedGivenNames(content)
    : [];
  const nisbaSubtype = isNisba ? readNisbaSubtype(content) : null;

  const fields: FicheField[] = [
    {
      label: t.casteOrSocialFunctionLabel,
      prose: casteOrSocialFunction,
    },
    {
      label: t.attestedFormsTitle,
      node:
        attestedForms.length > 0 ? (
          <ul>
            {attestedForms.map((form) => (
              <li key={form.spelling}>
                {form.spelling}
                {form.attestation ? (
                  <>
                    {" — "}
                    <PatronymeSourceCitation source={form.attestation} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : undefined,
    },
    {
      label: t.transmissionModeLabel,
      prose: transmissionMode
        ? t.transmissionModeLabels[transmissionMode]
        : null,
    },
    {
      label: t.designatedSocialUnitLabel,
      prose: designatedSocialUnit
        ? t.designatedSocialUnitLabels[designatedSocialUnit]
        : null,
    },
    {
      label: t.totemicFoodProhibitionLabel,
      prose: totemicFoodProhibition,
    },
    {
      label: t.permittedGivenNamesLabel,
      prose:
        permittedGivenNames.length > 0 ? permittedGivenNames.join(", ") : null,
    },
    {
      label: t.nisbaSubtypeLabel,
      prose: nisbaSubtype ? t.nisbaSubtypeLabels[nisbaSubtype] : null,
    },
  ];

  return (
    <FicheSection title={t.nameSystemSectionTitle}>
      <FicheFieldList fields={fields} />
    </FicheSection>
  );
}

export default PatronymeNamingSystemSection;

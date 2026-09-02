import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheFieldList, type FicheField } from "@/components/fiche/FicheProse";
import { FicheSection } from "@/components/fiche/FicheSection";
import { PatronymeSourceCitation } from "@/components/patronymes/PatronymeSourceCitation";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import {
  readDesignatedSocialUnit,
  readGaps,
  readNisbaSubtype,
  readPermittedGivenNames,
  readSpellings,
  readTotemicFoodProhibition,
  readTransmissionMode,
} from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
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

  const spellings = readSpellings(content);
  const transmissionMode = readTransmissionMode(content);
  const designatedSocialUnit = readDesignatedSocialUnit(content);
  const gaps = readGaps(content);

  /** The editor's own wording for an empty field, when they wrote one. */
  const gapNode = (fieldPath: string) => {
    const chapter = resolveChapter("name", fieldPath, null, gaps);
    return chapter.state === "documented-gap" ? (
      <FieldProvenanceMarker state={chapter.state} reason={chapter.reason} />
    ) : undefined;
  };

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
      node: casteOrSocialFunction
        ? undefined
        : gapNode("casteOrSocialFunction"),
    },
    {
      label: t.attestedFormsTitle,
      node:
        spellings.length > 0 ? (
          <ul>
            {spellings.map((form) => (
              <li key={form.spelling}>
                <strong>{form.spelling}</strong>
                {form.countryIds.length > 0 ? (
                  <span>
                    {" — "}
                    {t.spellingAttestedInPrefix} {form.countryIds.join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          gapNode("spellings")
        ),
    },
    {
      label: t.transmissionModeLabel,
      prose: transmissionMode
        ? t.transmissionModeLabels[transmissionMode]
        : null,
      node: transmissionMode ? undefined : gapNode("transmissionMode"),
    },
    {
      label: t.designatedSocialUnitLabel,
      prose: designatedSocialUnit
        ? t.designatedSocialUnitLabels[designatedSocialUnit]
        : null,
      node: designatedSocialUnit ? undefined : gapNode("designatedSocialUnit"),
    },
    {
      label: t.totemicFoodProhibitionLabel,
      prose: totemicFoodProhibition,
      node:
        !isTotemicClan || totemicFoodProhibition
          ? undefined
          : gapNode("totemicFoodProhibition"),
    },
    {
      label: t.permittedGivenNamesLabel,
      prose:
        permittedGivenNames.length > 0 ? permittedGivenNames.join(", ") : null,
      node:
        !isTotemicClan || permittedGivenNames.length > 0
          ? undefined
          : gapNode("permittedGivenNames"),
    },
    {
      label: t.nisbaSubtypeLabel,
      prose: nisbaSubtype ? t.nisbaSubtypeLabels[nisbaSubtype] : null,
      node: !isNisba || nisbaSubtype ? undefined : gapNode("nisbaSubtype"),
    },
  ];

  return (
    <FicheSection title={t.nameSystemSectionTitle}>
      <FicheFieldList fields={fields} />
    </FicheSection>
  );
}

export default PatronymeNamingSystemSection;

import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * How a reveal names where its claim was read, in English — the sidecar of
 * `revealProvenance.ts`, keyed by the same field paths (REQ-145).
 *
 * Each value is the tail of a sentence the reveal opens with "According to",
 * which is why none of them starts with a capital. "Fiche" is kept: it is
 * the word this atlas uses for its own records in English as in French, in
 * the API reference and the brand charter alike, and an English reader who
 * clicks through lands on a page that calls itself one.
 *
 * Agent-authored under DEC-048, hence `machine`.
 */
export interface RevealProvenanceEn {
  provenance: Extract<TranslationKind, "machine">;
  wordingByFieldPath: Record<string, string>;
}

const ATLAS_OUTLINES = "the boundary outlines published by the atlas";

// @req REQ-145
export const REVEAL_PROVENANCE_EN: RevealProvenanceEn = {
  provenance: "machine",
  wordingByFieldPath: {
    "lib/atlas/assets/africaAdmin0": ATLAS_OUTLINES,
    "lib/atlas/assets/worldCompare": ATLAS_OUTLINES,
    "lib/games/landmarks":
      "the city and cape coordinates published by the atlas",

    languageFamilyId: "the language family the fiche declares",
    "content.appellations.selfAppellation": "the autonym the fiche declares",
    "content.appellations.whyProblematic":
      "what the fiche says about why this name is problematic",
    "content.appellations.originOfExonyms":
      "the origin of the exonyms, as the fiche gives it",
    "content.demography": "the demography the fiche declares",
    "content.demography.distributionByCountry":
      "the distribution by country the fiche declares",
    "content.languages.mainLanguage": "the main language the fiche declares",
    "content.culture.majorRites": "the major rites the fiche describes",
    "content.culture.spiritualities": "the spiritualities the fiche describes",
    "content.culture.symbols": "the symbols the fiche describes",
    "content.culture.dominantReligions":
      "the dominant religions the fiche describes",
    "content.historicalRole.kingdomsOrChiefdoms":
      "the kingdoms and chiefdoms the fiche cites",
    "content.organization.traditionalPoliticalSystem":
      "the traditional political organisation the fiche describes",
    "content.origins.migrationRoutes": "the migration routes the fiche traces",
    etymology: "the etymology the fiche gives",
    nameOriginActor: "who, according to the fiche, gave this name",
    "content.historicalNames.colonization":
      "the names borne under colonisation, according to the fiche",
    "content.kingdoms": "the kingdoms the fiche cites",
    "content.historicalFacts.precolonial":
      "the precolonial facts the fiche reports",
  },
};

// @req REQ-145
export function revealProvenanceEn(fieldPath: string): string | null {
  return REVEAL_PROVENANCE_EN.wordingByFieldPath[fieldPath] ?? null;
}

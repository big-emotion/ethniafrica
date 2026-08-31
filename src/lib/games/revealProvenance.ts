/**
 * How a reveal names where its claim was read, in French.
 *
 * The reveal used to print `reveal.fieldPath` verbatim — the player finished a
 * round and was shown `content.appellations.selfAppellation`, or, on Mercator,
 * the repository path `lib/atlas/assets/africaAdmin0`. Games charter §8 is
 * explicit that the audience knows nothing about the subject, and a reader who
 * knows nothing about African peoples knows less still about this project's
 * JSON schema.
 *
 * `fieldPath` stays exactly as it is in the data: it is the auditable record,
 * it keys the assertion rows, and the sweep compares against it. What changes
 * is that the *presentation* layer translates it. Keeping the two apart is why
 * this lives here and not on `GameReveal` — the bank holds eleven thousand
 * rounds, and re-wording them would have meant a migration to fix a caption.
 *
 * A path with no wording returns `null` and the reveal simply omits the line.
 * That silence is covered by a test over `TEMPLATE_FIELD_PATHS`, so a new
 * template fails the build rather than quietly reintroducing the raw path.
 */

/** Mercator measures its own areas, so its provenance is the asset, not a fiche. */
const ATLAS_OUTLINES = "les tracés de frontières publiés par l'atlas";

/**
 * Keyed by the same strings `TEMPLATE_FIELD_PATHS` and the round builders
 * emit. Each value is the tail of a sentence the reveal opens with « D'après »,
 * which is why none of them starts with a capital.
 */
const WORDING_BY_FIELD_PATH: Record<string, string> = {
  "lib/atlas/assets/africaAdmin0": ATLAS_OUTLINES,
  "lib/atlas/assets/worldCompare": ATLAS_OUTLINES,
  "lib/games/landmarks":
    "les coordonnées de villes et de caps publiées par l'atlas",

  languageFamilyId: "la famille linguistique déclarée par la fiche",
  "content.appellations.selfAppellation":
    "l'auto-appellation déclarée par la fiche",
  "content.appellations.whyProblematic":
    "ce que la fiche dit du caractère problématique de ce nom",
  "content.appellations.originOfExonyms":
    "l'origine des exonymes, telle que la fiche la donne",
  "content.demography": "la démographie déclarée par la fiche",
  "content.demography.distributionByCountry":
    "la répartition par pays déclarée par la fiche",
  "content.languages.mainLanguage":
    "la langue principale déclarée par la fiche",
  "content.languages.isoCodes": "les codes ISO 639-3 déclarés par la fiche",
  "content.culture.majorRites": "les rites majeurs décrits par la fiche",
  "content.culture.spiritualities": "les spiritualités décrites par la fiche",
  "content.culture.symbols": "les symboles décrits par la fiche",
  "content.culture.dominantReligions":
    "les religions dominantes décrites par la fiche",
  "content.historicalRole.kingdomsOrChiefdoms":
    "les royaumes et chefferies cités par la fiche",
  "content.organization.traditionalPoliticalSystem":
    "l'organisation politique traditionnelle décrite par la fiche",
  "content.origins.migrationRoutes":
    "les routes de migration retracées par la fiche",
  etymology: "l'étymologie donnée par la fiche",
  nameOriginActor: "qui, selon la fiche, a donné ce nom",
  "content.historicalNames.colonization":
    "les noms portés pendant la colonisation, d'après la fiche",
  "content.kingdoms": "les royaumes cités par la fiche",
  "content.historicalFacts.precolonial":
    "les faits précoloniaux rapportés par la fiche",
};

// @req REQ-120
export function revealProvenanceFr(fieldPath: string): string | null {
  return WORDING_BY_FIELD_PATH[fieldPath] ?? null;
}

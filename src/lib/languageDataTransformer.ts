import type { LanguageDetail } from "@/api/v2/services/languageService";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";

/**
 * The language fiche's view model — `LanguageDetail` (REQ-136) reshaped for
 * the parchment, the same move `transformPeopleData` and
 * `transformFamilyData` make for the other two fiches.
 *
 * The only reshaping this entity needs is its sources: the service already
 * hands over `id`/`name`/`family`/`speakingPeoples`/`vehicularRole`/
 * `vitalityStatus` in the shape the page renders directly, but its sources
 * carry `title`/`tier`, while `SourcesFooter` (shared by all three fiches)
 * reads `label`/`standing`.
 */
export interface LanguagePageData {
  id: string;
  name: string;
  nameProvenance: LanguageDetail["nameProvenance"];
  isoCode639_3: LanguageDetail["isoCode639_3"];
  glottocode: LanguageDetail["glottocode"];
  nameEn: LanguageDetail["nameEn"];
  alternateNames: LanguageDetail["alternateNames"];
  spellingAliases: LanguageDetail["spellingAliases"];
  dialects: LanguageDetail["dialects"];
  family: LanguageDetail["family"];
  speakingPeoples: LanguageDetail["speakingPeoples"];
  vehicularRole: LanguageDetail["vehicularRole"];
  vitalityStatus: LanguageDetail["vitalityStatus"];
  sources: FicheSourceEntry[];
}

// @req REQ-136
export function transformLanguageData(
  language: LanguageDetail
): LanguagePageData {
  return {
    id: language.id,
    name: language.name,
    nameProvenance: language.nameProvenance,
    isoCode639_3: language.isoCode639_3,
    glottocode: language.glottocode,
    nameEn: language.nameEn,
    alternateNames: language.alternateNames,
    spellingAliases: language.spellingAliases,
    dialects: language.dialects,
    family: language.family,
    speakingPeoples: language.speakingPeoples,
    vehicularRole: language.vehicularRole,
    vitalityStatus: language.vitalityStatus,
    sources: language.sources.map((source) => ({
      label: source.title,
      url: source.url,
      standing: source.tier,
      notes: source.notes ?? undefined,
    })),
  };
}

import { logger } from "@/lib/api/logger";
import type { CountryLanguagesFact } from "@/lib/countryLanguagesFact";
import { createServerClient } from "@/lib/supabase/server";
import { getLanguageRelations } from "./languageFacet";
import { listAfrikLanguages } from "./languages";
import { getAfrikPeopleIdsInCountry } from "./peoples";
import type { LanguageReference } from "@/types/afrik";

/**
 * A country's own list takes precedence. Otherwise, a language reaches it
 * through resident peoples who speak it; the language's name must not itself
 * be a derivative of a people record.
 */
// @req REQ-119
export async function getCountryLanguagesFact(
  countryId: string,
  declaredLanguages?: readonly LanguageReference[]
): Promise<CountryLanguagesFact> {
  if (declaredLanguages?.some(({ name }) => name.trim())) {
    return { value: [...declaredLanguages], provenance: "declared" };
  }

  const [relations, residentIds] = await Promise.all([
    getLanguageRelations(),
    getAfrikPeopleIdsInCountry(countryId),
  ]);
  const residents = new Set(residentIds);
  const peopleIdsByLanguage = new Map<string, string[]>();
  for (const [languageId, countryIds] of relations.countriesByLanguage) {
    if (!countryIds.includes(countryId)) continue;
    const peopleIds = (
      relations.peoplesByLanguage.get(languageId) ?? []
    ).filter((id) => residents.has(id));
    if (peopleIds.length) peopleIdsByLanguage.set(languageId, peopleIds);
  }

  if (peopleIdsByLanguage.size === 0) {
    return { value: [], provenance: "missing" };
  }

  const ids = [...peopleIdsByLanguage.keys()].sort();
  const [roster, metadata] = await Promise.all([
    listAfrikLanguages({
      page: 1,
      perPage: ids.length,
      filters: { ids },
    }),
    createServerClient()
      .from("afrik_languages")
      .select("id, content")
      .in("id", ids),
  ]);

  if (metadata.error) {
    logger.error(
      `Error reading language name provenance for ${countryId}`,
      metadata.error
    );
    throw metadata.error;
  }
  if (roster.total > roster.languages.length) {
    throw new Error(`Language roster truncated for country ${countryId}`);
  }

  const provenanceById = new Map(
    (metadata.data ?? []).map((row) => [
      row.id,
      (row.content as { nameProvenance?: string } | null)?.nameProvenance,
    ])
  );
  const languages = roster.languages
    .filter(
      (language) =>
        provenanceById.has(language.id) &&
        provenanceById.get(language.id) !== "derived"
    )
    .map((language) => ({
      name: language.name.trim(),
      isoCode: language.id,
    }))
    .filter(({ name }) => name)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "fr") || a.isoCode.localeCompare(b.isoCode)
    );

  const value: LanguageReference[] = [];
  const seenNames = new Set<string>();
  const from = new Set<string>();
  for (const language of languages) {
    for (const peopleId of peopleIdsByLanguage.get(language.isoCode) ?? []) {
      from.add(peopleId);
    }
    const key = language.name.toLocaleLowerCase("fr");
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    value.push(language);
  }

  if (value.length === 0) return { value: [], provenance: "missing" };
  return { value, provenance: "derived", from: [...from].sort() };
}

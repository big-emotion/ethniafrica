import { unstable_cache } from "next/cache";

import { getCountryIndex } from "@/api/v2/services/countryService";
import { logger } from "@/lib/api/logger";
import { getLanguageRelations } from "@/lib/supabase/queries/afrik/languageFacet";
import {
  listAfrikLanguages,
  type AfrikLanguageListItem,
  type LanguageQueryFilters,
} from "@/lib/supabase/queries/afrik/languages";

/**
 * What the language facet of the atlas hub reads.
 *
 * Its own service rather than a tail on the languages query module: that one
 * answers "give me languages", while this answers the three questions one
 * screen asks together — the page being read, the filters it may be narrowed
 * by, and what the shared map should say about each country under those
 * filters. Keeping them together is what stops the list and the globe panel
 * being narrowed by two different notions of "the current selection".
 */

export interface LanguagePresence {
  id: string;
  countryIds: string[];
  peopleIds: string[];
}

/** The reader's narrowing, as it arrives from the query string: null is "no filter". */
export interface LanguagesFacetFilters {
  familyId: string | null;
  countryId: string | null;
  /**
   * Declared for symmetry with the name facet and deliberately not offered as
   * a control: the corpus records 1.61 peoples per language, and only 261 of
   * 753 have more than one, so the select would not narrow a list — it would
   * do a lookup the language fiche already offers in the other direction
   * (`getAfrikSpeakingPeoples`).
   */
  peopleId: string | null;
  letter: string | null;
  search?: string | null;
}

export interface LanguagesFacetOption {
  id: string;
  label: string;
}

export interface LanguagesFacetChoices {
  families: LanguagesFacetOption[];
  countries: LanguagesFacetOption[];
}

export interface LanguagesFacetPage {
  languages: AfrikLanguageListItem[];
  page: number;
  total: number;
  totalPages: number;
}

export interface LanguageCountryIndexRow {
  id: string;
  name: string;
  countryIds: string[];
}

/** 748 languages is sixteen pages at this size; the corpus is walkable. */
// @req REQ-139
export const LANGUAGES_FACET_PER_PAGE = 48;

/** An allowlist, because the size becomes a `.range()` on a database query. */
// @req REQ-139
export const LANGUAGES_FACET_PAGE_SIZES = [48, 96] as const;

/**
 * Above the corpus (748) and below PostgREST's 1000-row ceiling, where a
 * truncated page and a last page are indistinguishable. Read once an hour
 * behind the cache, not once per render — which is what the index page did on
 * every request with `perPage: 1000`, sitting exactly on the ceiling, so the
 * 1001st language would have been dropped in silence.
 */
const LANGUAGE_ROSTER_SIZE = 900;

/**
 * Where each language stands on the map.
 *
 * Cached for an hour, like the family presence it mirrors (DEC-018): the
 * corpus moves on an editorial cadence, and this is a walk of two whole tables
 * that every page of the facet would otherwise repeat. Returned as an array
 * rather than a Map because `unstable_cache` persists by serialization, and a
 * Map comes back from that as an empty object — the lesson
 * `getLanguageFamilyPresence` already wrote down.
 *
 * Every language of the roster is listed, including the ones the derivation
 * places nowhere. A language no people is recorded as speaking belongs in the
 * reading list with an empty footprint rather than being dropped to make the
 * map look complete.
 */
// @req REQ-117
export const getLanguagePresence = unstable_cache(
  async (): Promise<LanguagePresence[]> => {
    const [{ countriesByLanguage, peoplesByLanguage }, roster] =
      await Promise.all([
        getLanguageRelations(),
        listAfrikLanguages({ page: 1, perPage: LANGUAGE_ROSTER_SIZE }),
      ]);

    // A roster sized against the corpus is a guess with an expiry date. Say so
    // when the corpus outgrows it, rather than dropping the overflow in the
    // silence this constant exists to avoid in the first place.
    if (roster.total > LANGUAGE_ROSTER_SIZE) {
      logger.warn("Language roster truncated — raise LANGUAGE_ROSTER_SIZE", {
        rosterSize: LANGUAGE_ROSTER_SIZE,
        corpusTotal: roster.total,
        dropped: roster.total - LANGUAGE_ROSTER_SIZE,
      });
    }

    return roster.languages.map((language) => ({
      id: language.id,
      countryIds: countriesByLanguage.get(language.id) ?? [],
      peopleIds: peoplesByLanguage.get(language.id) ?? [],
    }));
  },
  ["language-presence"],
  { revalidate: 3600 }
);

/** The facet's filters in the shape the query layer names them. */
async function toQueryFilters(
  filters: LanguagesFacetFilters
): Promise<LanguageQueryFilters | null> {
  const query: LanguageQueryFilters = {};
  const search = filters.search?.trim();
  if (search) query.search = search;
  if (filters.letter) query.initialLetter = filters.letter;
  if (filters.familyId) query.familyId = filters.familyId;

  if (filters.countryId || filters.peopleId) {
    const presence = await getLanguagePresence();
    query.ids = presence
      .filter(
        (language) =>
          (!filters.countryId ||
            language.countryIds.includes(filters.countryId)) &&
          (!filters.peopleId || language.peopleIds.includes(filters.peopleId))
      )
      .map((language) => language.id);
  }

  return query;
}

/**
 * One page of the facet, narrowed at the database.
 *
 * A page past the end is answered with the last one rather than with nothing:
 * addresses outlive the selection they were taken from.
 */
// @req REQ-139
export async function getLanguagesFacetPage(
  page: number,
  filters: LanguagesFacetFilters,
  perPage: number = LANGUAGES_FACET_PER_PAGE
): Promise<LanguagesFacetPage> {
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const query = await toQueryFilters(filters);

  const firstRead = await listAfrikLanguages({
    page: requested,
    perPage,
    filters: query ?? {},
  });
  const total = firstRead.total;
  let languages = firstRead.languages;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  let resolved = requested;
  if (requested > totalPages) {
    resolved = totalPages;
    ({ languages } = await listAfrikLanguages({
      page: resolved,
      perPage,
      filters: query ?? {},
    }));
  }

  return { languages, page: resolved, total, totalPages };
}

/**
 * Every language of the current selection, with the countries it reaches.
 *
 * The whole selection, never the page being read: publishing only the current
 * page would make the globe panel's answer depend on where the reader had
 * paged to, which is not a property of the corpus.
 *
 * No extra relation query — the footprint is already in memory from the hourly
 * cache, and this joins it against the ids the same filters select.
 */
// @req REQ-117
export async function getLanguagesFacetCountryIndex(
  filters: LanguagesFacetFilters
): Promise<LanguageCountryIndexRow[]> {
  const query = await toQueryFilters(filters);
  const [selection, presence] = await Promise.all([
    listAfrikLanguages({
      page: 1,
      perPage: LANGUAGE_ROSTER_SIZE,
      filters: query ?? {},
    }),
    getLanguagePresence(),
  ]);

  const footprint = new Map(
    presence.map((language) => [language.id, language.countryIds])
  );

  return selection.languages.map((language) => ({
    id: language.id,
    name: language.name,
    countryIds: footprint.get(language.id) ?? [],
  }));
}

/**
 * What the reader may narrow to.
 *
 * Only families and countries the corpus actually places a language in. An
 * option that can only ever return nothing reads as a claim the corpus holds
 * that country, and answers "aucune langue" when the reader takes the claim up.
 *
 * It is also the safety net for the failure no test can see: if
 * `afrik_people_languages` is applied but never loaded, the derivation
 * produces no country at all, and this offers **no country control** rather
 * than fifty-four options that each return nothing.
 */
// @req REQ-139
export async function getLanguagesFacetChoices(): Promise<LanguagesFacetChoices> {
  const [presence, roster, countries] = await Promise.all([
    getLanguagePresence(),
    listAfrikLanguages({ page: 1, perPage: LANGUAGE_ROSTER_SIZE }),
    // The same hourly-cached read the atlas layout already makes for the
    // globe's shading, so naming the countries costs nothing.
    getCountryIndex().catch(() => []),
  ]);

  const byFrenchLabel = (a: LanguagesFacetOption, b: LanguagesFacetOption) =>
    a.label.localeCompare(b.label, "fr");

  const families = new Map<string, string>();
  for (const language of roster.languages) {
    families.set(language.family.id, language.family.name);
  }

  const nameOfCountry = new Map<string, string>(
    countries.map((country) => [country.id, country.nameFr] as const)
  );
  const reached = new Set(presence.flatMap((language) => language.countryIds));

  return {
    families: Array.from(families, ([id, label]) => ({ id, label })).sort(
      byFrenchLabel
    ),
    countries: Array.from(reached, (id) => ({
      id,
      label: nameOfCountry.get(id) ?? id,
    })).sort(byFrenchLabel),
  };
}

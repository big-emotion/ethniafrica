import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import { walkRanges } from "@/lib/supabase/queries/walkRanges";

/**
 * The corpus-scale reads the languages facet needs and no single-language
 * query can answer: which peoples speak a language, and which countries that
 * puts it in.
 *
 * Its own module rather than a tail on `languages.ts`, for the reason
 * `languageFamilyFacet.ts` is its own: these are aggregates over the whole
 * corpus for one surface, not another way to read a language, and both have to
 * reason about PostgREST's row ceiling — which reading a language never does.
 */

/**
 * Rows asked for per request when walking a corpus table. The server may
 * answer fewer; `walkRanges` keeps reading until a page comes back empty.
 */
// @req REQ-136
export const LANGUAGE_FACET_PAGE_SIZE = 500;

/**
 * 748 languages and ~1 270 speaking relations cannot fill this many pages;
 * reaching the bound means the range is being ignored, and looping on a server
 * that ignores it would never end.
 */
const LANGUAGE_FACET_MAX_PAGES = 40;

export interface LanguageRelations {
  /** ISO 639-3 → the countries its speaking peoples live in. */
  countriesByLanguage: Map<string, string[]>;
  /** ISO 639-3 → the peoples the corpus records as speaking it. */
  peoplesByLanguage: Map<string, string[]>;
}

async function walkTable<Row>(table: string, columns: string): Promise<Row[]> {
  const supabase = createServerClient();

  const walk = await walkRanges(
    async (from, to) => {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .range(from, to);

      if (error) {
        logger.error(`Error walking ${table} for the languages facet`, error);
        throw error;
      }
      return (data ?? []) as Row[];
    },
    { pageSize: LANGUAGE_FACET_PAGE_SIZE, maxPages: LANGUAGE_FACET_MAX_PAGES }
  );

  if (walk.truncated) {
    logger.error(
      `${table} exceeded ${LANGUAGE_FACET_MAX_PAGES} pages — the languages facet is reading a truncated corpus`
    );
  }
  return walk.rows;
}

/**
 * Both relations of a language, from one pass over the two tables that hold
 * them.
 *
 * **Derived, never declared.** No table links a language to a country, and
 * none should: the atlas charter reads a footprint off the peoples (§1), which
 * is what `getCountryIdsByLanguageFamily` already does one level up the
 * hierarchy — family ← people → country. A language sits between the two, so
 * the same rule applies a fortiori. Materialising it would turn a derivation
 * into a stored fact and give it an authority the corpus never asserts.
 *
 * Two walks and an in-memory join rather than an embedded select: the join
 * table has no foreign key PostgREST can traverse in the direction this needs,
 * and 748 languages against ~1 270 relations is a join small enough that
 * asking the database to do it buys nothing.
 *
 * The empty-table check is the one guard that cannot be a unit test of the
 * page. Migration 054 creates `afrik_people_languages` **empty** and it only
 * fills when `migrateAfrikToDatabase` re-runs; empty, nothing throws — every
 * language gets no footprint, the country control offers nothing, and the
 * facet reads as a corpus with no geography. A relation table with no rows at
 * all is never a legitimate reading of this corpus, so it is reported.
 */
// @req REQ-117
export async function getLanguageRelations(): Promise<LanguageRelations> {
  const [speakers, residences] = await Promise.all([
    walkTable<{ people_id: string; language_id: string }>(
      "afrik_people_languages",
      "people_id, language_id"
    ),
    walkTable<{ people_id: string; country_id: string }>(
      "afrik_people_countries",
      "people_id, country_id"
    ),
  ]);

  if (speakers.length === 0) {
    logger.error(
      "afrik_people_languages is empty — every language will read as having no speakers and no countries. Migration 054 creates the table empty; it fills when the corpus loader runs."
    );
  }

  const countriesOfPeople = new Map<string, Set<string>>();
  for (const residence of residences) {
    const countries =
      countriesOfPeople.get(residence.people_id) ?? new Set<string>();
    countries.add(residence.country_id);
    countriesOfPeople.set(residence.people_id, countries);
  }

  const countriesByLanguage = new Map<string, Set<string>>();
  const peoplesByLanguage = new Map<string, Set<string>>();

  for (const speaker of speakers) {
    const peoples =
      peoplesByLanguage.get(speaker.language_id) ?? new Set<string>();
    peoples.add(speaker.people_id);
    peoplesByLanguage.set(speaker.language_id, peoples);

    const countries =
      countriesByLanguage.get(speaker.language_id) ?? new Set<string>();
    for (const countryId of countriesOfPeople.get(speaker.people_id) ?? []) {
      countries.add(countryId);
    }
    countriesByLanguage.set(speaker.language_id, countries);
  }

  const sorted = (source: Map<string, Set<string>>) =>
    new Map(
      Array.from(source, ([languageId, values]) => [
        languageId,
        Array.from(values).sort(),
      ])
    );

  return {
    countriesByLanguage: sorted(countriesByLanguage),
    peoplesByLanguage: sorted(peoplesByLanguage),
  };
}

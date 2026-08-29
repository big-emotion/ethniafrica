import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";

/**
 * The two corpus-scale reads the families facet needs and no single-entity
 * query can answer: where a family is present, and how many peoples no
 * published family reaches.
 *
 * Its own module rather than a tail on `languageFamilies.ts` for the reason
 * `peopleCountryCounts.ts` is its own: these are aggregates over the whole
 * corpus for one surface, not another way to read a family, and both have to
 * reason about PostgREST's row ceiling — which reading a family never does.
 */

/**
 * Rows per page when walking a corpus table. Kept well under PostgREST's
 * default 1000-row ceiling: a page the server truncated would be short, and a
 * short page is how the walk knows it has reached the end.
 */
// @req REQ-110
export const FAMILY_FACET_PAGE_SIZE = 500;

/**
 * ~789 peoples and their country relations cannot fill this many pages;
 * reaching the bound means the range is being ignored, and looping on a server
 * that ignores it would never end.
 */
const FAMILY_FACET_MAX_PAGES = 40;

/**
 * PostgREST reads `,` as the end of a value and `"` as a quote, so an
 * identifier carrying either would end the `in.()` list early and silently
 * widen the count built on it. AFRIK family ids are `FLG_*`; anything else is
 * dropped, which narrows the filter rather than widening it.
 */
const SAFE_IDENTIFIER = /^[\w-]+$/;

async function walkTable<Row>(table: string, columns: string): Promise<Row[]> {
  const supabase = createServerClient();
  const rows: Row[] = [];

  for (let page = 0; page < FAMILY_FACET_MAX_PAGES; page++) {
    const start = page * FAMILY_FACET_PAGE_SIZE;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(start, start + FAMILY_FACET_PAGE_SIZE - 1);

    if (error) {
      logger.error(`Error walking ${table} for the families facet`, error);
      throw error;
    }

    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < FAMILY_FACET_PAGE_SIZE) return rows;
  }

  logger.error(
    `${table} exceeded ${FAMILY_FACET_MAX_PAGES} pages — the families facet is reading a truncated corpus`
  );
  return rows;
}

/**
 * Language family id → the countries its peoples live in.
 *
 * Derived, never declared: a family's own fiche states a geographic area in
 * prose, and the atlas charter reads a footprint off the peoples instead
 * (§1). So the walk goes family ← people → country, through the two tables
 * that hold those two facts, and a family whose peoples all carry a
 * sub-family's id — Afro-asiatique, the one such family in the corpus —
 * simply does not appear. That absence is the corpus speaking, not a gap to
 * paper over.
 *
 * Two walks and an in-memory join rather than an embedded select: the join
 * table has no foreign key PostgREST can traverse in the direction this
 * needs, and 789 peoples against their relations is a join small enough that
 * asking the database to do it buys nothing.
 */
// @req REQ-117
export async function getCountryIdsByLanguageFamily(): Promise<
  Map<string, string[]>
> {
  const [peoples, relations] = await Promise.all([
    walkTable<{ id: string; language_family_id: string | null }>(
      "afrik_peoples",
      "id, language_family_id"
    ),
    walkTable<{ people_id: string; country_id: string }>(
      "afrik_people_countries",
      "people_id, country_id"
    ),
  ]);

  const familyOfPeople = new Map<string, string>();
  for (const people of peoples) {
    if (people.language_family_id) {
      familyOfPeople.set(people.id, people.language_family_id);
    }
  }

  const countriesByFamily = new Map<string, Set<string>>();
  for (const relation of relations) {
    const familyId = familyOfPeople.get(relation.people_id);
    if (!familyId) continue;
    const countries = countriesByFamily.get(familyId) ?? new Set<string>();
    countries.add(relation.country_id);
    countriesByFamily.set(familyId, countries);
  }

  return new Map(
    Array.from(countriesByFamily, ([familyId, countries]) => [
      familyId,
      Array.from(countries).sort(),
    ])
  );
}

/**
 * How many peoples no published family reaches — those with no
 * `language_family_id` at all, and those pointing at a family the corpus does
 * not publish.
 *
 * The roster is the argument, and that is the whole point. This figure used to
 * be a subtraction against the families on the page the reader happened to be
 * on, so turning to page 2 changed how many peoples the corpus was said to
 * leave unclassified. It is a measure of the corpus; only the corpus's own
 * family list can produce it.
 *
 * A head-only `count: "exact"` rather than a row walk: nothing is fetched, so
 * the 1000-row ceiling that truncates a walk cannot reach it either.
 */
// @req REQ-108
export async function countUnclassifiedPeoples(
  publishedFamilyIds: readonly string[]
): Promise<number> {
  const supabase = createServerClient();
  const query = supabase
    .from("afrik_peoples")
    .select("*", { count: "exact", head: true });

  const usable = publishedFamilyIds.filter((id) => SAFE_IDENTIFIER.test(id));
  if (usable.length < publishedFamilyIds.length) {
    logger.error(
      "Dropped a language family id unsafe for a PostgREST list — the unclassified count over-reports"
    );
  }

  // No published family means no people is reachable through one, so every
  // people is unclassified — and `not.in.()` with an empty list is not a
  // filter PostgREST accepts.
  const { count, error } = await (usable.length === 0
    ? query
    : query.or(
        `language_family_id.is.null,language_family_id.not.in.(${usable
          .map((id) => `"${id}"`)
          .join(",")})`
      ));

  if (error) {
    logger.error("Error counting unclassified peoples", error);
    throw error;
  }

  return count ?? 0;
}

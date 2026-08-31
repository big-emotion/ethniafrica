import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";

/**
 * Which linguistic families the corpus places in each country.
 *
 * The countries facet filters on this, and there is no column to filter on:
 * a family reaches a country only through its peoples, so the answer is the
 * `afrik_peoples` → `afrik_people_countries` join folded down to a set.
 *
 * Folded here rather than pushed into PostgREST as an embedded filter. The
 * facet needs the *whole* mapping — the filter's own option list is built
 * from it, so that no option can be offered that returns nothing — and one
 * mapping costs two small reads where a per-family embedded query would cost
 * one round trip per option.
 *
 * Its own module rather than a tail on peoples.ts, for the reason
 * peopleCountryCounts.ts is one: this is a corpus-wide fold for a single
 * surface, not another way to read a people.
 */

/**
 * Rows per page. Under PostgREST's 1000-row default ceiling, so that a page
 * the server truncated cannot be mistaken for the last one — a short page is
 * how the walk below knows it has reached the end.
 */
// @req REQ-110
export const COUNTRY_FAMILY_PAGE_SIZE = 500;

/**
 * 803 peoples and 1618 relations on the recette corpus. Hitting this bound
 * means the range is being ignored, and looping against a server that ignores
 * it would never end.
 */
const COUNTRY_FAMILY_MAX_PAGES = 40;

/**
 * Every row of a table, read a page at a time.
 *
 * `orderBy` is not cosmetic and not a sort the caller wanted: a `.range()`
 * over a query with no total order pages across an undefined row order, so
 * rows are silently dropped and others served twice. The columns given are
 * always a key, which is what makes the order total.
 */
async function readAllRows<Row>(
  supabase: ReturnType<typeof createServerClient>,
  table: string,
  columns: string,
  orderBy: readonly string[]
): Promise<Row[]> {
  const rows: Row[] = [];

  for (let page = 0; page < COUNTRY_FAMILY_MAX_PAGES; page++) {
    const start = page * COUNTRY_FAMILY_PAGE_SIZE;
    let query = supabase.from(table).select(columns);
    for (const column of orderBy) {
      query = query.order(column);
    }

    const { data, error } = await query.range(
      start,
      start + COUNTRY_FAMILY_PAGE_SIZE - 1
    );

    if (error) {
      logger.error(`Error walking ${table}`, error);
      throw error;
    }

    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < COUNTRY_FAMILY_PAGE_SIZE) return rows;
  }

  logger.error(
    `${table} exceeded ${COUNTRY_FAMILY_MAX_PAGES} pages — the fold is truncated`
  );
  return rows;
}

/**
 * Country id → the ids of the families present there, in a stable order.
 *
 * A family is listed once per country however many of its peoples live there:
 * the facet asks whether a family is present, not how heavily.
 */
// @req REQ-116
export async function getLanguageFamilyIdsByCountry(): Promise<
  Map<string, string[]>
> {
  const supabase = createServerClient();

  const peoples = await readAllRows<{
    id: string;
    language_family_id: string | null;
  }>(supabase, "afrik_peoples", "id, language_family_id", ["id"]);

  const familyByPeople = new Map<string, string>();
  for (const people of peoples) {
    // An unclassified people belongs to no family. Bucketing it under a
    // placeholder would put an option in the filter naming nothing a reader
    // could then look up.
    if (people.language_family_id) {
      familyByPeople.set(people.id, people.language_family_id);
    }
  }

  const relations = await readAllRows<{
    people_id: string;
    country_id: string;
  }>(supabase, "afrik_people_countries", "people_id, country_id", [
    "people_id",
    "country_id",
  ]);

  const families = new Map<string, Set<string>>();
  for (const relation of relations) {
    const familyId = familyByPeople.get(relation.people_id);
    if (!familyId) continue;

    const present = families.get(relation.country_id) ?? new Set<string>();
    present.add(familyId);
    families.set(relation.country_id, present);
  }

  return new Map(
    [...families].map(([countryId, present]) => [
      countryId,
      [...present].sort(),
    ])
  );
}

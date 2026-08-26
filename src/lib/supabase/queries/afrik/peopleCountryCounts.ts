import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";

/**
 * Continent-scale counts over the afrik_people_countries join table.
 *
 * Its own module rather than a tail on peoples.ts: this is an aggregate over
 * the whole corpus for one map, not another way to read a people, and the
 * paging guard below is the only place in the query layer that has to reason
 * about PostgREST's row ceiling.
 */

/**
 * Rows per page when walking afrik_people_countries. Kept well under
 * PostgREST's default 1000-row ceiling: a page the server truncated would be
 * short, and a short page is how the walk knows it has reached the end.
 */
// @req REQ-110
export const PEOPLE_COUNTRY_PAGE_SIZE = 500;

/**
 * A corpus of ~789 peoples across 54 countries cannot produce more relations
 * than this; hitting the bound means the range is being ignored, and looping
 * on a server that ignores it would never end.
 */
const PEOPLE_COUNTRY_MAX_PAGES = 40;

/**
 * Number of documented peoples per country, grouped over the
 * afrik_people_countries join table (indexed on country_id, migration 006).
 *
 * The walk applies an explicit .range() on every request. An unranged select
 * is silently capped server-side by PostgREST's max-rows, which is what made
 * language families unreachable in REQ-110 — here it would quietly under-count
 * the best-documented countries, i.e. exactly the ones the continent scene
 * draws.
 */
// @req REQ-110
export async function getPeopleCountsByCountry(): Promise<Map<string, number>> {
  const supabase = createServerClient();
  const counts = new Map<string, number>();

  for (let page = 0; page < PEOPLE_COUNTRY_MAX_PAGES; page++) {
    const start = page * PEOPLE_COUNTRY_PAGE_SIZE;
    const { data, error } = await supabase
      .from("afrik_people_countries")
      .select("country_id")
      .range(start, start + PEOPLE_COUNTRY_PAGE_SIZE - 1);

    if (error) {
      logger.error("Error fetching people counts by country", error);
      throw error;
    }

    const rows = data || [];
    for (const row of rows) {
      const countryId = row.country_id as string;
      counts.set(countryId, (counts.get(countryId) || 0) + 1);
    }

    if (rows.length < PEOPLE_COUNTRY_PAGE_SIZE) return counts;
  }

  logger.error(
    `People-country relations exceeded ${PEOPLE_COUNTRY_MAX_PAGES} pages — counts are truncated`
  );
  return counts;
}

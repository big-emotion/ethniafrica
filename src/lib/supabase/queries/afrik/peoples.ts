/**
 * Supabase queries for AFRIK peoples
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import type { ClassificationStatus, People } from "@/types/afrik";

export interface PeopleQueryFilters {
  search?: string;
  initialLetter?: string;
  languageFamilyId?: string;
  /**
   * ISO 3166-1 alpha-3. Resolved against the join table *before* the peoples
   * query rather than applied to its result — see getAfrikPeopleIdsInCountry.
   */
  countryId?: string;
}

/**
 * Rows per request when walking a filtered set of peoples or their countries.
 *
 * Kept well under PostgREST's 1000-row ceiling for the same reason
 * peopleCountryCounts.ts keeps its own: a page the server truncated comes back
 * short, and a short page is how the walk knows it has reached the end. At the
 * ceiling itself the two are indistinguishable.
 */
// @req REQ-110
export const PEOPLE_FACET_WALK_SIZE = 500;

/**
 * A corpus of ~790 peoples across 54 countries cannot fill this many pages;
 * reaching it means the range is being ignored, and a loop against a server
 * that ignores it would never end.
 */
const PEOPLE_FACET_MAX_PAGES = 40;

/**
 * The subset of the PostgREST builder the shared filters need.
 *
 * Restated rather than imported: constraining the helper's generic to the real
 * builder type makes the compiler unfold supabase-js's column-string inference
 * once per filter, which it gives up on ("type instantiation is excessively
 * deep"). The two casts below are what buys one filter definition instead of
 * two copies drifting apart.
 */
interface FilterablePeopleQuery {
  textSearch(
    column: string,
    query: string,
    options: { type: "websearch"; config: string }
  ): FilterablePeopleQuery;
  ilike(column: string, pattern: string): FilterablePeopleQuery;
  eq(column: string, value: string): FilterablePeopleQuery;
  in(column: string, values: string[]): FilterablePeopleQuery;
}

/**
 * The reader's narrowing, applied to whichever peoples query is being built.
 *
 * One place rather than two: the list and the map index answer the same
 * question about the same selection, and a filter that drifted between them
 * would show a globe panel listing peoples the list beside it does not.
 */
function withPeopleFilters<Query>(
  query: Query,
  filters: PeopleQueryFilters,
  scopedIds: string[] | null
): Query {
  let scoped = query as unknown as FilterablePeopleQuery;

  if (filters.search) {
    scoped = scoped.textSearch("search_vector", filters.search, {
      type: "websearch",
      config: "french",
    });
  }
  if (filters.initialLetter) {
    scoped = scoped.ilike("name_main", `${filters.initialLetter}%`);
  }
  if (filters.languageFamilyId) {
    scoped = scoped.eq("language_family_id", filters.languageFamilyId);
  }
  if (scopedIds) {
    scoped = scoped.in("id", scopedIds);
  }

  return scoped as unknown as Query;
}

/**
 * Bucket key for peoples whose language_family_id is null/empty.
 */
// @req REQ-108
export const UNCLASSIFIED_FAMILY_KEY = "__unclassified__";

/**
 * Build a map of people_id -> country_ids[] from a batch query
 */
async function getCountryRelationsMap(
  supabase: ReturnType<typeof createServerClient>,
  peopleIds: string[]
): Promise<Map<string, string[]>> {
  if (peopleIds.length === 0) return new Map();

  const { data: allRelations } = await supabase
    .from("afrik_people_countries")
    .select("people_id, country_id")
    .in("people_id", peopleIds);

  const map = new Map<string, string[]>();
  for (const rel of allRelations || []) {
    const existing = map.get(rel.people_id) || [];
    existing.push(rel.country_id);
    map.set(rel.people_id, existing);
  }
  return map;
}

/**
 * Map raw DB rows to People objects using a pre-fetched relations map
 */
function mapRowsToPeoples(
  rows: Array<Record<string, unknown>>,
  relationsMap: Map<string, string[]>
): People[] {
  return rows.map((row) => ({
    id: row.id as string,
    nameMain: row.name_main as string,
    languageFamilyId: row.language_family_id as string,
    currentCountries: relationsMap.get(row.id as string) || [],
    classificationStatus:
      (row.classification_status as ClassificationStatus | null) ?? null,
    content: (row.content as Record<string, unknown>) || {},
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  }));
}

/**
 * Get all AFRIK peoples with optional pagination
 */
// @req REQ-019
export async function getAllAfrikPeoples(
  page?: number,
  perPage?: number
): Promise<People[]> {
  const supabase = createServerClient();
  let query = supabase.from("afrik_peoples").select("*").order("name_main");

  if (page && perPage) {
    const start = (page - 1) * perPage;
    query = query.range(start, start + perPage - 1);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching AFRIK peoples", error);
    throw error;
  }

  const peopleIds = (data || []).map((row) => row.id);
  const relationsMap = await getCountryRelationsMap(supabase, peopleIds);

  return mapRowsToPeoples(data || [], relationsMap);
}

/**
 * Ids of the peoples the corpus records in one country.
 *
 * Resolved before the peoples query, never after it. Narrowing a loaded page
 * instead answers "which of these twenty are Ghanaian" rather than "which
 * peoples are Ghanaian" — and leaves the total beside it describing the whole
 * corpus, so the pager offers pages of a set the reader is not being shown.
 *
 * Walked with an explicit .range(): an unranged select is capped server-side by
 * PostgREST's max-rows, which here would quietly drop the peoples of the
 * best-documented countries, i.e. the ones the filter is most used on.
 */
// @req REQ-110
export async function getAfrikPeopleIdsInCountry(
  countryId: string
): Promise<string[]> {
  const supabase = createServerClient();
  const peopleIds: string[] = [];

  for (let page = 0; page < PEOPLE_FACET_MAX_PAGES; page++) {
    const start = page * PEOPLE_FACET_WALK_SIZE;
    const { data, error } = await supabase
      .from("afrik_people_countries")
      .select("people_id")
      .eq("country_id", countryId)
      .range(start, start + PEOPLE_FACET_WALK_SIZE - 1);

    if (error) {
      logger.error(`Error fetching people ids for country ${countryId}`, error);
      throw error;
    }

    const rows = data || [];
    for (const row of rows) peopleIds.push(row.people_id as string);
    if (rows.length < PEOPLE_FACET_WALK_SIZE) return peopleIds;
  }

  logger.error(
    `People ids for country ${countryId} exceeded ${PEOPLE_FACET_MAX_PAGES} pages — the list is truncated`
  );
  return peopleIds;
}

/**
 * Resolves the country filter, or reports that nothing can match it.
 *
 * `null` means "no country filter"; an empty array means "a country the corpus
 * documents nobody in", and the two must not collapse — PostgREST rejects
 * `in.()`, and falling through to the unfiltered query would serve the whole
 * continent under that country's name.
 */
async function resolveCountryScope(
  filters: PeopleQueryFilters
): Promise<string[] | null> {
  if (!filters.countryId) return null;
  return getAfrikPeopleIdsInCountry(filters.countryId);
}

// @req REQ-033
export async function getPaginatedAfrikPeoples(
  page: number,
  perPage: number,
  filters: PeopleQueryFilters = {}
): Promise<{ data: People[]; total: number }> {
  const scopedIds = await resolveCountryScope(filters);
  if (scopedIds && scopedIds.length === 0) return { data: [], total: 0 };

  const supabase = createServerClient();
  const start = (page - 1) * perPage;
  const query = withPeopleFilters(
    supabase
      .from("afrik_peoples")
      .select("*, afrik_people_countries(country_id)", { count: "exact" }),
    filters,
    scopedIds
  );

  const { data, error, count } = await query
    .order("name_main")
    .range(start, start + perPage - 1);

  if (error) {
    logger.error("Error fetching paginated AFRIK peoples", error);
    throw error;
  }

  const relationsMap = new Map<string, string[]>();
  for (const row of data || []) {
    relationsMap.set(
      row.id,
      (row.afrik_people_countries || []).map((relation) => relation.country_id)
    );
  }

  return {
    data: mapRowsToPeoples(data || [], relationsMap),
    total: count ?? 0,
  };
}

/** One people of a selection, with the countries the corpus places it in. */
export interface PeopleCountryIndexRow {
  id: string;
  nameMain: string;
  countryIds: string[];
}

/**
 * Every people of a selection and the countries it touches.
 *
 * The map is the hub's, not the page's, so a click on it can land on any
 * country — including one whose peoples all sort onto some other page of the
 * list. Publishing only the current page would make the panel's answer depend
 * on where the reader had paged to, which is not a property of the corpus.
 * Hence the whole filtered set, walked with an explicit .range() and read
 * without `content`: names and country ids are all the panel shows, and the
 * JSONB is by far the heaviest column.
 */
// @req REQ-117
export async function getAfrikPeopleCountryIndex(
  filters: PeopleQueryFilters = {}
): Promise<PeopleCountryIndexRow[]> {
  const scopedIds = await resolveCountryScope(filters);
  if (scopedIds && scopedIds.length === 0) return [];

  const supabase = createServerClient();
  const index: PeopleCountryIndexRow[] = [];

  for (let page = 0; page < PEOPLE_FACET_MAX_PAGES; page++) {
    const start = page * PEOPLE_FACET_WALK_SIZE;
    const query = withPeopleFilters(
      supabase
        .from("afrik_peoples")
        .select("id, name_main, afrik_people_countries(country_id)"),
      filters,
      scopedIds
    );

    const { data, error } = await query
      .order("name_main")
      .range(start, start + PEOPLE_FACET_WALK_SIZE - 1);

    if (error) {
      logger.error("Error fetching the peoples country index", error);
      throw error;
    }

    const rows = data || [];
    for (const row of rows) {
      index.push({
        id: row.id as string,
        nameMain: row.name_main as string,
        countryIds: (row.afrik_people_countries || []).map(
          (relation: { country_id: string }) => relation.country_id
        ),
      });
    }
    if (rows.length < PEOPLE_FACET_WALK_SIZE) return index;
  }

  logger.error(
    `The peoples country index exceeded ${PEOPLE_FACET_MAX_PAGES} pages — it is truncated`
  );
  return index;
}

/**
 * Get a single AFRIK people by ID
 */
// @req REQ-019
export async function getAfrikPeopleById(id: string): Promise<People | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(`Error fetching AFRIK people ${id}`, error);
    throw error;
  }

  if (!data) return null;

  const relationsMap = await getCountryRelationsMap(supabase, [id]);

  return mapRowsToPeoples([data], relationsMap)[0];
}

/**
 * Get AFRIK peoples by language family
 */
// @req REQ-019
export async function getAfrikPeoplesByLanguageFamily(
  familyId: string
): Promise<People[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("*")
    .eq("language_family_id", familyId)
    .order("name_main");

  if (error) {
    logger.error(`Error fetching AFRIK peoples for family ${familyId}`, error);
    throw error;
  }

  const peopleIds = (data || []).map((row) => row.id);
  const relationsMap = await getCountryRelationsMap(supabase, peopleIds);

  return mapRowsToPeoples(data || [], relationsMap);
}

/**
 * Get the named AFRIK peoples, whatever family they belong to.
 *
 * The family fiche uses this to resolve the peoples a macro-family's fiche
 * declares in `content.associatedPeoples` — they carry a sub-family's id, so
 * `getAfrikPeoplesByLanguageFamily` never returns them (REQ-116, see
 * src/lib/familyFootprintSource.ts).
 */
// @req REQ-116
export async function getAfrikPeoplesByIds(
  peopleIds: readonly string[]
): Promise<People[]> {
  // PostgREST rejects `in.()`, so an empty list has to short-circuit rather
  // than reach the database as a query that cannot parse.
  if (peopleIds.length === 0) return [];

  const supabase = createServerClient();
  const ids = [...peopleIds];
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("*")
    .in("id", ids)
    .order("name_main");

  if (error) {
    logger.error("Error fetching AFRIK peoples by id", error);
    throw error;
  }

  const foundIds = (data || []).map((row) => row.id);
  const relationsMap = await getCountryRelationsMap(supabase, foundIds);

  return mapRowsToPeoples(data || [], relationsMap);
}

/**
 * Get AFRIK peoples by country
 */
// @req REQ-019
export async function getAfrikPeoplesByCountry(
  countryId: string
): Promise<People[]> {
  const supabase = createServerClient();
  const { data: relations, error: relationsError } = await supabase
    .from("afrik_people_countries")
    .select("people_id")
    .eq("country_id", countryId);

  if (relationsError) {
    logger.error(
      `Error fetching relations for country ${countryId}`,
      relationsError
    );
    throw relationsError;
  }

  if (!relations || relations.length === 0) {
    return [];
  }

  const peopleIds = relations.map((r) => r.people_id);
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("*")
    .in("id", peopleIds)
    .order("name_main");

  if (error) {
    logger.error(
      `Error fetching AFRIK peoples for country ${countryId}`,
      error
    );
    throw error;
  }

  const relationsMap = await getCountryRelationsMap(supabase, peopleIds);

  return mapRowsToPeoples(data || [], relationsMap);
}

/**
 * Get the number of stored afrik_peoples rows per language_family_id, in a
 * single grouped query (REQ-108). Rows with a null/empty language_family_id
 * are tallied under UNCLASSIFIED_FAMILY_KEY so callers can surface them
 * instead of silently dropping them.
 */
// @req REQ-108
export async function getPeopleCountsByLanguageFamily(): Promise<
  Map<string, number>
> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("language_family_id");

  if (error) {
    logger.error("Error fetching people counts by language family", error);
    throw error;
  }

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const key =
      (row.language_family_id as string | null) || UNCLASSIFIED_FAMILY_KEY;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/**
 * Search AFRIK peoples using Postgres FTS on search_vector (websearch, french).
 */
// @req REQ-019
export async function searchAfrikPeoples(query: string): Promise<People[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("*")
    .textSearch("search_vector", query, { type: "websearch", config: "french" })
    .order("name_main");

  if (error) {
    logger.error("Error searching AFRIK peoples", error);
    throw error;
  }

  const peopleIds = (data || []).map((row) => row.id);
  const relationsMap = await getCountryRelationsMap(supabase, peopleIds);

  return mapRowsToPeoples(data || [], relationsMap);
}

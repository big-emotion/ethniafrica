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

// @req REQ-033
export async function getPaginatedAfrikPeoples(
  page: number,
  perPage: number,
  filters: PeopleQueryFilters = {}
): Promise<{ data: People[]; total: number }> {
  const supabase = createServerClient();
  const start = (page - 1) * perPage;
  let query = supabase
    .from("afrik_peoples")
    .select("*, afrik_people_countries(country_id)", { count: "exact" });

  if (filters.search) {
    query = query.textSearch("search_vector", filters.search, {
      type: "websearch",
      config: "french",
    });
  }
  if (filters.initialLetter) {
    query = query.ilike("name_main", `${filters.initialLetter}%`);
  }
  if (filters.languageFamilyId) {
    query = query.eq("language_family_id", filters.languageFamilyId);
  }

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

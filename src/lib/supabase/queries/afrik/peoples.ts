/**
 * Supabase queries for AFRIK peoples
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import type { People } from "@/types/afrik";

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
    content: (row.content as Record<string, unknown>) || {},
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  }));
}

/**
 * Get all AFRIK peoples with optional pagination
 */
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
 * Get a single AFRIK people by ID
 */
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
 * Get AFRIK peoples by country
 */
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
 * Search AFRIK peoples by query
 */
export async function searchAfrikPeoples(query: string): Promise<People[]> {
  const supabase = createServerClient();
  const queryLower = query.toLowerCase();

  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("*")
    .or(`id.ilike.%${queryLower}%,name_main.ilike.%${queryLower}%`)
    .order("name_main");

  if (error) {
    logger.error("Error searching AFRIK peoples", error);
    throw error;
  }

  const peopleIds = (data || []).map((row) => row.id);
  const relationsMap = await getCountryRelationsMap(supabase, peopleIds);

  return mapRowsToPeoples(data || [], relationsMap);
}

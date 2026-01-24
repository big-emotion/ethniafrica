/**
 * Supabase queries for AFRIK peoples
 */

import { createServerClient } from "../../server";
import type { People } from "@/types/afrik";

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
    console.error("Error fetching AFRIK peoples:", error);
    throw error;
  }

  // Get relations for currentCountries
  const peoples: People[] = [];
  for (const row of data || []) {
    const { data: relations } = await supabase
      .from("afrik_people_countries")
      .select("country_id")
      .eq("people_id", row.id);

    peoples.push({
      id: row.id,
      nameMain: row.name_main,
      languageFamilyId: row.language_family_id,
      currentCountries: (relations || []).map((r) => r.country_id),
      content: row.content || {},
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    });
  }

  return peoples;
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
    console.error(`Error fetching AFRIK people ${id}:`, error);
    throw error;
  }

  if (!data) return null;

  // Get relations for currentCountries
  const { data: relations } = await supabase
    .from("afrik_people_countries")
    .select("country_id")
    .eq("people_id", id);

  return {
    id: data.id,
    nameMain: data.name_main,
    languageFamilyId: data.language_family_id,
    currentCountries: (relations || []).map((r) => r.country_id),
    content: data.content || {},
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
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
    console.error(
      `Error fetching AFRIK peoples for family ${familyId}:`,
      error
    );
    throw error;
  }

  // Get relations for currentCountries
  const peoples: People[] = [];
  for (const row of data || []) {
    const { data: relations } = await supabase
      .from("afrik_people_countries")
      .select("country_id")
      .eq("people_id", row.id);

    peoples.push({
      id: row.id,
      nameMain: row.name_main,
      languageFamilyId: row.language_family_id,
      currentCountries: (relations || []).map((r) => r.country_id),
      content: row.content || {},
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    });
  }

  return peoples;
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
    console.error(
      `Error fetching relations for country ${countryId}:`,
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
    console.error(
      `Error fetching AFRIK peoples for country ${countryId}:`,
      error
    );
    throw error;
  }

  // Get all relations for currentCountries
  const peoples: People[] = [];
  for (const row of data || []) {
    const { data: peopleRelations } = await supabase
      .from("afrik_people_countries")
      .select("country_id")
      .eq("people_id", row.id);

    peoples.push({
      id: row.id,
      nameMain: row.name_main,
      languageFamilyId: row.language_family_id,
      currentCountries: (peopleRelations || []).map((r) => r.country_id),
      content: row.content || {},
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    });
  }

  return peoples;
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
    console.error("Error searching AFRIK peoples:", error);
    throw error;
  }

  // Get relations for currentCountries
  const peoples: People[] = [];
  for (const row of data || []) {
    const { data: relations } = await supabase
      .from("afrik_people_countries")
      .select("country_id")
      .eq("people_id", row.id);

    peoples.push({
      id: row.id,
      nameMain: row.name_main,
      languageFamilyId: row.language_family_id,
      currentCountries: (relations || []).map((r) => r.country_id),
      content: row.content || {},
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    });
  }

  return peoples;
}

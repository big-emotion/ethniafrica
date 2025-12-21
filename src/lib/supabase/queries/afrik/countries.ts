/**
 * Supabase queries for AFRIK countries
 */

import { createServerClient } from "../../server";
import type { Country } from "@/types/afrik";

/**
 * Get all AFRIK countries with optional pagination
 */
export async function getAllAfrikCountries(
  page?: number,
  perPage?: number
): Promise<Country[]> {
  const supabase = createServerClient();
  let query = supabase.from("afrik_countries").select("*").order("name_fr");

  if (page && perPage) {
    const start = (page - 1) * perPage;
    query = query.range(start, start + perPage - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching AFRIK countries:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    etymology: row.etymology || undefined,
    nameOriginActor: row.name_origin_actor || undefined,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

/**
 * Get a single AFRIK country by ISO code
 */
export async function getAfrikCountryById(
  iso: string
): Promise<Country | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_countries")
    .select("*")
    .eq("id", iso)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error(`Error fetching AFRIK country ${iso}:`, error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    nameFr: data.name_fr,
    etymology: data.etymology || undefined,
    nameOriginActor: data.name_origin_actor || undefined,
    content: data.content || {},
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
}

/**
 * Search AFRIK countries by query (full-text search on name_fr and content)
 */
export async function searchAfrikCountries(query: string): Promise<Country[]> {
  const supabase = createServerClient();
  const queryLower = query.toLowerCase();

  const { data, error } = await supabase
    .from("afrik_countries")
    .select("*")
    .or(`id.ilike.%${queryLower}%,name_fr.ilike.%${queryLower}%`)
    .order("name_fr");

  if (error) {
    console.error("Error searching AFRIK countries:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    etymology: row.etymology || undefined,
    nameOriginActor: row.name_origin_actor || undefined,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

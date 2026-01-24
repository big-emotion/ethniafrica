/**
 * Supabase queries for AFRIK language families
 */

import { createServerClient } from "../../server";
import type { LanguageFamily } from "@/types/afrik";

/**
 * Get all AFRIK language families with optional pagination
 */
export async function getAllAfrikLanguageFamilies(
  page?: number,
  perPage?: number
): Promise<LanguageFamily[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("afrik_language_families")
    .select("*")
    .order("name_fr");

  if (page && perPage) {
    const start = (page - 1) * perPage;
    query = query.range(start, start + perPage - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching AFRIK language families:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    nameEn: row.name_en || undefined,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

/**
 * Get a single AFRIK language family by ID
 */
export async function getAfrikLanguageFamilyById(
  id: string
): Promise<LanguageFamily | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_language_families")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error(`Error fetching AFRIK language family ${id}:`, error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    nameFr: data.name_fr,
    nameEn: data.name_en || undefined,
    content: data.content || {},
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
}

/**
 * Search AFRIK language families by query
 */
export async function searchAfrikLanguageFamilies(
  query: string
): Promise<LanguageFamily[]> {
  const supabase = createServerClient();
  const queryLower = query.toLowerCase();

  const { data, error } = await supabase
    .from("afrik_language_families")
    .select("*")
    .or(
      `id.ilike.%${queryLower}%,name_fr.ilike.%${queryLower}%,name_en.ilike.%${queryLower}%`
    )
    .order("name_fr");

  if (error) {
    console.error("Error searching AFRIK language families:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    nameEn: row.name_en || undefined,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

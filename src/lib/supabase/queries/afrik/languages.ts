/**
 * Supabase queries for AFRIK languages
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import type { Language } from "@/types/afrik";

/**
 * Get all AFRIK languages belonging to a language family, ordered by name.
 * Returns [] for an unknown/empty family id (no throw).
 */
export async function getAfrikLanguagesByFamily(
  familyId: string
): Promise<Language[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_languages")
    .select("*")
    .eq("family_id", familyId)
    .order("name");

  if (error) {
    logger.error(
      `Error fetching AFRIK languages for family ${familyId}`,
      error
    );
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    familyId: row.family_id,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

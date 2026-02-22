/**
 * Language Family Service - Business logic for language families
 */

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import type { LanguageFamily } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

/**
 * Get paginated list of language families
 */
export async function getLanguageFamilies(
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResult<LanguageFamily>> {
  const all = await getAllAfrikLanguageFamilies();
  const start = (page - 1) * perPage;
  const data = all.slice(start, start + perPage);
  return { data, total: all.length };
}

/**
 * Get a single language family by FLG_ ID
 * Note: Individual items use direct query for now (less critical than lists)
 */
export async function getLanguageFamilyById(
  id: string
): Promise<LanguageFamily | null> {
  return await getAfrikLanguageFamilyById(id);
}

/**
 * Language Family Service - Business logic for language families
 */

import { unstable_cache } from "next/cache";
import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import type { LanguageFamily } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

// Cache with 24h revalidation
const getCachedAllLanguageFamilies = unstable_cache(
  async () => getAllAfrikLanguageFamilies(),
  ["afrik-language-families-all"],
  { revalidate: 86400 }
);

/**
 * Get paginated list of language families
 */
export async function getLanguageFamilies(
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResult<LanguageFamily>> {
  const all = await getCachedAllLanguageFamilies();
  const start = (page - 1) * perPage;
  const data = all.slice(start, start + perPage);
  return { data, total: all.length };
}

/**
 * Get a single language family by FLG_ ID
 */
export async function getLanguageFamilyById(
  id: string
): Promise<LanguageFamily | null> {
  const cachedGetLanguageFamily = unstable_cache(
    async () => getAfrikLanguageFamilyById(id),
    [`afrik-language-family-${id}`],
    { revalidate: 86400 }
  );
  return await cachedGetLanguageFamily();
}

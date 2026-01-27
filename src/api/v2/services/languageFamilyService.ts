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
 * Get cached all language families using fetch with tags
 * This allows targeted cache invalidation via revalidateTag()
 */
async function getCachedAllLanguageFamilies(): Promise<LanguageFamily[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const response = await fetch(
      `${baseUrl}/api/v2/internal/language-families`,
      {
        next: {
          revalidate: 3600, // 1 hour
          tags: ["afrik-language-families"],
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch language families: ${response.statusText}`
      );
    }

    return response.json();
  } catch (error) {
    // Fallback to direct query if fetch fails (e.g., in development without server running)
    console.warn(
      "Fetch failed, falling back to direct query:",
      error instanceof Error ? error.message : error
    );
    return getAllAfrikLanguageFamilies();
  }
}

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
 * Note: Individual items use direct query for now (less critical than lists)
 */
export async function getLanguageFamilyById(
  id: string
): Promise<LanguageFamily | null> {
  return await getAfrikLanguageFamilyById(id);
}

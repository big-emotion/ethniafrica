/**
 * People Service - Business logic for peoples
 */

import {
  getAllAfrikPeoples,
  getAfrikPeopleById,
  getAfrikPeoplesByLanguageFamily,
} from "@/lib/supabase/queries/afrik/peoples";
import type { People } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

/**
 * Get cached all peoples using fetch with tags
 * This allows targeted cache invalidation via revalidateTag()
 */
async function getCachedAllPeoples(): Promise<People[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${baseUrl}/api/v2/internal/peoples`, {
      next: {
        revalidate: 3600, // 1 hour
        tags: ["afrik-peoples"],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch peoples: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // Fallback to direct query if fetch fails (e.g., in development without server running)
    console.warn(
      "Fetch failed, falling back to direct query:",
      error instanceof Error ? error.message : error
    );
    return getAllAfrikPeoples();
  }
}

/**
 * Get paginated list of peoples
 */
export async function getPeoples(
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResult<People>> {
  const all = await getCachedAllPeoples();
  const start = (page - 1) * perPage;
  const data = all.slice(start, start + perPage);
  return { data, total: all.length };
}

/**
 * Get a single people by PPL_ ID
 * Note: Individual items use direct query for now (less critical than lists)
 */
export async function getPeopleById(id: string): Promise<People | null> {
  return await getAfrikPeopleById(id);
}

/**
 * Get peoples by language family
 * Note: Filtered queries use direct query for now (less critical than lists)
 */
export async function getPeoplesByLanguageFamily(
  familyId: string
): Promise<People[]> {
  return await getAfrikPeoplesByLanguageFamily(familyId);
}

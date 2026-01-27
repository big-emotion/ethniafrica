/**
 * Country Service - Business logic for countries
 */

import {
  getAllAfrikCountries,
  getAfrikCountryById,
} from "@/lib/supabase/queries/afrik/countries";
import type { Country } from "@/types/afrik";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

/**
 * Get cached all countries using fetch with tags
 * This allows targeted cache invalidation via revalidateTag()
 */
async function getCachedAllCountries(): Promise<Country[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${baseUrl}/api/v2/internal/countries`, {
      next: {
        revalidate: 3600, // 1 hour
        tags: ["afrik-countries"],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // Fallback to direct query if fetch fails (e.g., in development without server running)
    console.warn(
      "Fetch failed, falling back to direct query:",
      error instanceof Error ? error.message : error
    );
    return getAllAfrikCountries();
  }
}

/**
 * Get paginated list of countries
 */
export async function getCountries(
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResult<Country>> {
  // For pagination, we can either:
  // 1. Get all and paginate in memory (current approach for simplicity)
  // 2. Use database pagination (more efficient but requires total count query)
  const all = await getCachedAllCountries();
  const start = (page - 1) * perPage;
  const data = all.slice(start, start + perPage);
  return { data, total: all.length };
}

/**
 * Get a single country by ISO code
 * Note: Individual items use direct query for now (less critical than lists)
 */
export async function getCountryById(id: string): Promise<Country | null> {
  return await getAfrikCountryById(id);
}

/**
 * Country Service - Business logic for countries
 */

import { unstable_cache } from "next/cache";
import {
  getAllAfrikCountries,
  getAfrikCountryById,
} from "@/lib/supabase/queries/afrik/countries";
import type { Country } from "@/types/afrik";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

// Cache with 24h revalidation
const getCachedAllCountries = unstable_cache(
  async () => getAllAfrikCountries(),
  ["afrik-countries-all"],
  { revalidate: 86400 }
);

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
 */
export async function getCountryById(id: string): Promise<Country | null> {
  const cachedGetCountry = unstable_cache(
    async () => getAfrikCountryById(id),
    [`afrik-country-${id}`],
    { revalidate: 86400 }
  );
  return await cachedGetCountry();
}

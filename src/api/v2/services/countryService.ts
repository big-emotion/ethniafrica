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
 * Get paginated list of countries
 */
export async function getCountries(
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResult<Country>> {
  const all = await getAllAfrikCountries();
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

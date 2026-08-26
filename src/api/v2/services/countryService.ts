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
// @req REQ-019
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
 * Every country the corpus holds a fiche for, name and id only.
 *
 * Deliberately not derived from the admin-0 geometry: three geometric
 * entries have no fiche and six fiches have no geometry, so a list built
 * from the asset would offer dead ends and hide real countries.
 */
// @req REQ-116
export async function getCountryIndex(): Promise<
  Array<{ id: string; nameFr: string }>
> {
  const all = await getAllAfrikCountries();
  return all.map((country) => ({ id: country.id, nameFr: country.nameFr }));
}

/**
 * Get a single country by ISO code
 * Note: Individual items use direct query for now (less critical than lists)
 */
// @req REQ-019
export async function getCountryById(id: string): Promise<Country | null> {
  return await getAfrikCountryById(id);
}

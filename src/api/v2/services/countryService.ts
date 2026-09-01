/**
 * Country Service - Business logic for countries
 */

import {
  getAllAfrikCountries,
  getAfrikCountryById,
} from "@/lib/supabase/queries/afrik/countries";
import {
  compactCountryAtlasLanguages,
  deriveCountrySynthesis,
} from "@/lib/home/countrySynthesis";
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

export interface CountryAtlasIndexEntry {
  id: string;
  population?: number;
  referenceYear?: number;
  languages: string[];
}

/**
 * The narrow country index required by the atlas picker and its brief panel.
 * Query access stays inside the service boundary; the route receives only
 * serializable facts that the panel is approved to show.
 */
// @req REQ-117
export async function getCountryAtlasIndex(): Promise<
  CountryAtlasIndexEntry[]
> {
  const all = await getAllAfrikCountries();

  return all.map((country) => ({
    id: country.id,
    population: country.content?.demographics?.totalPopulation,
    referenceYear: country.content?.demographics?.referenceYear,
    languages: compactCountryAtlasLanguages(
      deriveCountrySynthesis(country).languages
    ),
  }));
}

/**
 * Get a single country by ISO code
 * Note: Individual items use direct query for now (less critical than lists)
 */
// @req REQ-019
export async function getCountryById(id: string): Promise<Country | null> {
  return await getAfrikCountryById(id);
}

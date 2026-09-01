/**
 * Country Service - Business logic for countries
 */

import {
  getAllAfrikCountries,
  getAfrikCountryById,
} from "@/lib/supabase/queries/afrik/countries";
import { deriveCountrySynthesis } from "@/lib/home/countrySynthesis";
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

export interface CountryAtlasBrief {
  id: Country["id"];
  nameFr: string;
  officialName?: string;
  population?: number;
  populationReferenceYear?: number;
  languages: string[];
  peoples: string[];
}

/**
 * The small, serializable record a selected-country panel needs.
 *
 * The country page already reads the full index to build its picker. Reducing
 * those rows here keeps the client boundary narrow while letting the panel say
 * more than a corpus count. Three names per list are enough for an overview;
 * the fiche remains the complete reading.
 */
// @req REQ-117
export async function getCountryAtlasIndex(): Promise<CountryAtlasBrief[]> {
  const all = await getAllAfrikCountries();

  return all.map((country) => {
    const synthesis = deriveCountrySynthesis(country);
    const demographics = country.content?.demographics;

    return {
      id: country.id,
      nameFr: country.nameFr,
      officialName: country.nameOfficial,
      population: demographics?.totalPopulation,
      populationReferenceYear: demographics?.referenceYear,
      languages: synthesis.languages.slice(0, 3),
      peoples: synthesis.peoples.slice(0, 3).map((people) => people.name),
    };
  });
}

/**
 * Get a single country by ISO code
 * Note: Individual items use direct query for now (less critical than lists)
 */
// @req REQ-019
export async function getCountryById(id: string): Promise<Country | null> {
  return await getAfrikCountryById(id);
}

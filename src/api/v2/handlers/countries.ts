/**
 * Countries Handler - API handlers for countries
 */

import { getCountries, getCountryById } from "../services/countryService";
import type { Country, ApiResponse } from "@/types/afrik";
import { createPaginatedResponse } from "../utils/response";

/**
 * List countries with pagination
 */
export async function listCountriesHandler(
  page?: number,
  perPage?: number
): Promise<ApiResponse<Country[]>> {
  const { data, total } = await getCountries(page, perPage);
  return createPaginatedResponse(data, total, page, perPage);
}

/**
 * Get a single country by ISO code
 */
export async function getCountryHandler(id: string): Promise<Country | null> {
  return await getCountryById(id);
}

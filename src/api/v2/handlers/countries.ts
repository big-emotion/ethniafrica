/**
 * Countries Handler - API handlers for countries
 */

import { getCountries, getCountryById } from "@/api/v2/services/countryService";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { Country } from "@/types/afrik";

/**
 * List countries with pagination
 */
// @req REQ-084
export async function listCountriesHandler(
  page?: number,
  perPage?: number
): Promise<ApiEnvelope<Country[]>> {
  const { data, total } = await getCountries(page, perPage);
  const resolvedPage = page ?? 1;
  const resolvedPerPage = perPage ?? 20;

  return createApiResponse(data, {
    pagination: {
      total,
      page: resolvedPage,
      perPage: resolvedPerPage,
      totalPages: Math.ceil(total / resolvedPerPage),
    },
  });
}

/**
 * Get a single country by ISO code
 */
// @req REQ-084
export async function getCountryHandler(
  id: string
): Promise<ApiEnvelope<Country> | null> {
  const country = await getCountryById(id);
  return country ? createApiResponse(country) : null;
}

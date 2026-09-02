/**
 * Countries Handler - API handlers for countries
 */

import { getCountries, getCountryById } from "@/api/v2/services/countryService";
import {
  getCountryPatronymes,
  type CountryPatronymes,
} from "@/api/v2/services/patronymeFicheLinks";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { Country } from "@/types/afrik";

/**
 * A country, with the fifth corpus dimension attached as two lists.
 *
 * `attested` and `borneByPeoples` answer two different questions and are never
 * summed — see `docs/design/name-to-country-linking.md`. A client that wants
 * one list has to decide for itself which claim it is making.
 */
export interface CountryWithPatronymes extends Country {
  patronymes: CountryPatronymes;
}

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
// @req REQ-133
export async function getCountryHandler(
  id: string
): Promise<ApiEnvelope<CountryWithPatronymes> | null> {
  const country = await getCountryById(id);
  if (!country) return null;

  const patronymes = await getCountryPatronymes(id);
  return createApiResponse({ ...country, patronymes });
}

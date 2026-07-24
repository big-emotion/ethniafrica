/**
 * Search Handler — API handlers for the /v2/search endpoint.
 *
 * ftsSearchHandler: ETNI-38 FTS handler returning the Module #0 envelope.
 * searchHandler: legacy handler (backward compatibility).
 */

import { ftsSearch, search } from "../services/searchService";
import { createApiResponse } from "../utils/response";
import type {
  SearchFilters,
  SearchResult,
  FtsSearchParams,
} from "@/types/afrik";
import type { ApiEnvelope } from "../utils/response";

export interface FtsSearchData {
  peoples: object[];
  countries: object[];
  total: number;
}

export async function ftsSearchHandler(
  params: FtsSearchParams
): Promise<ApiEnvelope<FtsSearchData>> {
  const result = await ftsSearch(params);
  return createApiResponse<FtsSearchData>({
    peoples: result.peoples as object[],
    countries: result.countries as object[],
    total: result.total,
  });
}

export async function searchHandler(
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  return search(filters);
}

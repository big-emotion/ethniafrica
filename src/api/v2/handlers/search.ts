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
  families: object[];
  /**
   * Corpus-wide match counts. `total` used to be the size of the returned
   * page, which made it useless for paging; the ranking functions of
   * migration 044 count the whole match set.
   */
  peoplesTotal: number;
  countriesTotal: number;
  familiesTotal: number;
  total: number;
}

// @req REQ-002
export async function ftsSearchHandler(
  params: FtsSearchParams
): Promise<ApiEnvelope<FtsSearchData>> {
  const result = await ftsSearch(params);
  // The database already ordered these. Re-sorting here is what produced the
  // per-page ordering this endpoint used to return.
  return createApiResponse<FtsSearchData>({
    peoples: result.peoples as object[],
    countries: result.countries as object[],
    families: (result.families ?? []) as object[],
    peoplesTotal: result.peoplesTotal,
    countriesTotal: result.countriesTotal,
    familiesTotal: result.familiesTotal,
    total: result.total,
  });
}

// @req REQ-002
export async function searchHandler(
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  return search(filters);
}

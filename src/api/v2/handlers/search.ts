/**
 * Search Handler — API handlers for the /v2/search endpoint.
 *
 * ftsSearchHandler: ETNI-38 FTS handler returning the Module #0 envelope.
 */

import { ftsSearch } from "../services/searchService";
import { createApiResponse } from "../utils/response";
import type { FtsSearchParams } from "@/types/afrik";
import type { ApiEnvelope } from "../utils/response";

export interface FtsSearchData {
  peoples: object[];
  countries: object[];
  families: object[];
  persons: object[];
  patronymes: object[];
  languages: object[];
  /**
   * Corpus-wide match counts. `total` used to be the size of the returned
   * page, which made it useless for paging; the ranking functions of
   * migration 044 count the whole match set.
   */
  peoplesTotal: number;
  countriesTotal: number;
  familiesTotal: number;
  personsTotal: number;
  patronymesTotal: number;
  languagesTotal: number;
  total: number;
  /** Near-miss leads (REQ-125), populated only when `total` is 0. */
  leads: object[];
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
    persons: (result.persons ?? []) as object[],
    patronymes: (result.patronymes ?? []) as object[],
    languages: (result.languages ?? []) as object[],
    peoplesTotal: result.peoplesTotal,
    countriesTotal: result.countriesTotal,
    familiesTotal: result.familiesTotal,
    personsTotal: result.personsTotal,
    patronymesTotal: result.patronymesTotal,
    languagesTotal: result.languagesTotal,
    total: result.total,
    leads: (result.leads ?? []) as object[],
  });
}

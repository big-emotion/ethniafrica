/**
 * Search Service — business logic for search endpoints.
 *
 * ftsSearch: ETNI-38 FTS search (websearch_to_tsquery, confidence boost)
 * search: legacy multi-entity search (backward compatibility)
 */

import {
  ftsSearchEntities,
  searchAfrikAll,
} from "@/lib/supabase/queries/afrik/search";
import type {
  SearchFilters,
  SearchResult,
  FtsSearchParams,
  FtsSearchResponse,
} from "@/types/afrik";

// @req REQ-002
export async function ftsSearch(
  params: FtsSearchParams
): Promise<FtsSearchResponse> {
  return ftsSearchEntities(params);
}

// @req REQ-002
export async function search(
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  return searchAfrikAll(filters);
}

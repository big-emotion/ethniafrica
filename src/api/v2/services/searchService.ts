/**
 * Search Service — business logic for search endpoints.
 *
 * ftsSearch: ETNI-38 FTS search (prefix + accent-insensitive matching,
 * confidence boost — migration 052, REQ-129).
 *
 * The response carries both shapes and this layer chooses neither: the
 * grouped arrays (peoples, countries, families, persons, patronymes,
 * quizzes) answer a facet's question about one kind, and `results` is the
 * same hits merged and ordered on the cross-kind `normalizedScore` of
 * migration 068. Both are built in the query layer, where every mapped row
 * exists at once and where the sort can be proven against the RPC payloads
 * that produced it.
 */

import { ftsSearchEntities } from "@/lib/supabase/queries/afrik/search";
import type { FtsSearchParams, FtsSearchResponse } from "@/types/afrik";

// @req REQ-002
export async function ftsSearch(
  params: FtsSearchParams
): Promise<FtsSearchResponse> {
  return ftsSearchEntities(params);
}

/**
 * Search Service — business logic for search endpoints.
 *
 * ftsSearch: ETNI-38 FTS search (prefix + accent-insensitive matching,
 * confidence boost — migration 052, REQ-129)
 */

import { ftsSearchEntities } from "@/lib/supabase/queries/afrik/search";
import type { FtsSearchParams, FtsSearchResponse } from "@/types/afrik";

// @req REQ-002
export async function ftsSearch(
  params: FtsSearchParams
): Promise<FtsSearchResponse> {
  return ftsSearchEntities(params);
}

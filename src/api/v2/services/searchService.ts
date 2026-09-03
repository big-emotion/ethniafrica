/**
 * Search Service — business logic for search endpoints.
 *
 * ftsSearch: ETNI-38 FTS search (prefix + accent-insensitive matching,
 * confidence boost — migration 052, REQ-129).
 *
 * The query layer chooses one exclusive stream. Without a lens it returns the
 * non-quiz corpus kinds; `lens=quiz` returns quiz questions alone. In either
 * mode the grouped arrays and `results` are two shapes over the same selected
 * hits, ordered on the cross-kind `normalizedScore` of migration 069.
 */

import { ftsSearchEntities } from "@/lib/supabase/queries/afrik/search";
import type { FtsSearchParams, FtsSearchResponse } from "@/types/afrik";

// @req REQ-002
export async function ftsSearch(
  params: FtsSearchParams
): Promise<FtsSearchResponse> {
  return ftsSearchEntities(params);
}

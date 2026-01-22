/**
 * Search Handler - API handler for search
 */

import { search } from "../services/searchService";
import type { SearchFilters, SearchResult } from "@/types/afrik";

/**
 * Search across all entities
 */
export async function searchHandler(
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  return await search(filters);
}

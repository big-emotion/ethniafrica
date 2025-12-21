/**
 * Search Service - Search logic across all entities
 */

import { searchAfrikAll } from "@/lib/supabase/queries/afrik/search";
import type { SearchFilters, SearchResult } from "@/types/afrik";

/**
 * Search across countries, peoples, and language families
 * Uses Supabase queries for efficient database search
 */
export async function search(
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  return await searchAfrikAll(filters);
}

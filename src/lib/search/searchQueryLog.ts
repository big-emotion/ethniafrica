/**
 * Search query log emission helper.
 *
 * Writes a row to the `search_query_log` table (migration `050`) — the query
 * text, its result count and a timestamp (default `NOW()`). Failed searches
 * are the spec for the aliases "Alternate spellings are not found" (REQ-002)
 * needs to close, but only if they are recorded. No reader identifier, IP or
 * user agent is accepted or stored.
 *
 * Failures are swallowed by design, mirroring `@/lib/audit/log`: a logging
 * failure must never break the underlying search response.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/api/logger";

export type SearchQueryLogInput = {
  query: string;
  resultCount: number;
};

async function write(input: SearchQueryLogInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("search_query_log").insert({
      query: input.query,
      result_count: input.resultCount,
    });
    if (error) {
      logger.error("Failed to insert search_query_log row", error, {
        query: input.query,
      });
    }
  } catch (insertError) {
    logger.error("Search query log write threw", insertError, {
      query: input.query,
    });
  }
}

// @req REQ-002
export const searchQueryLog = {
  write,
};

/**
 * Server-side query helpers for moderation flags on AFRIK entities.
 *
 * Story 0.20 (FR31): public fiches surface an "unreachable_source" flag when
 * a source URL has been unreachable for >= 7 consecutive days. The badge
 * component reads from `getActiveSourceFlags` to know which source links
 * should be decorated.
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";

export interface ActiveSourceFlag {
  /** UUID of the unreachable source, when the flag carries it in metadata. */
  source_id: string;
}

/**
 * Return active (pending or reviewed) `unreachable_source` flags for the
 * given entity. The returned list is intended for "source à vérifier" badge
 * rendering; an empty list means no badge is shown.
 *
 * NB: the current `flags` table does not have a direct `source_id` column;
 * the convention adopted by Story 0.20 is that the (entity_type, entity_id)
 * pair is sufficient to flag the entire fiche. If the migration ever adds a
 * column for the specific source, this helper is the single place to extend.
 */
export async function getActiveSourceFlags(
  entityType: string,
  entityId: string
): Promise<ActiveSourceFlag[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("flags")
    .select("id, flag_type, status, auto_generated")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("flag_type", "unreachable_source")
    .eq("auto_generated", true)
    .in("status", ["pending", "reviewed"]);

  if (error) {
    logger.error(
      `Error fetching active source flags for ${entityType}:${entityId}`,
      error
    );
    return [];
  }

  // The current schema does not pin a specific source per flag, so we expose
  // a single placeholder entry meaning "this fiche has an active flag".
  return (data || []).map(() => ({ source_id: "" }));
}

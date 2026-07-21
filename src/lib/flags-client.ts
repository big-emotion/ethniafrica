/**
 * Browser-side helper to detect active `unreachable_source` flags.
 *
 * Story 0.20 (FR31): public fiches display a "source à vérifier" badge in
 * the Sources tab whenever a pending/reviewed auto-generated flag exists
 * for the entity. The `flags` table has a public read RLS policy, so the
 * anon client can query it directly.
 */

import { supabase } from "@/lib/supabase/client";

export async function hasActiveSourceFlag(
  entityType: string,
  entityId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("flags")
      .select("id")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("flag_kind", "other")
      .eq("auto_generated", true)
      .in("status", ["open", "under_review"])
      .limit(1);
    if (error) return false;
    return (data || []).length > 0;
  } catch {
    return false;
  }
}

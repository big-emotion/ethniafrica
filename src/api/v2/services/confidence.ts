/**
 * Confidence service — Supabase queries for the `confidence_scores` table.
 *
 * Reads the column layout introduced by migration 014 (ETNI-22). The
 * pre-014 schema only carries `score` + `methodology`; missing columns
 * are normalised to safe defaults so the public envelope stays stable.
 *
 * The public URL uses hyphenated entity types ("language-family"); inside
 * the database we use underscored values ("language_family") matching the
 * existing assertions/flags tables.
 */

import { createServerClient } from "@/lib/supabase/server";
import type {
  ConfidenceEntityType,
  ConfidenceRecord,
} from "@/api/v2/schemas/confidence";

function toInternalEntityType(entityType: ConfidenceEntityType): string {
  return entityType === "language-family" ? "language_family" : "people";
}

export async function getConfidenceFor(
  entityType: ConfidenceEntityType,
  entityId: string
): Promise<ConfidenceRecord | null> {
  const supabase = createServerClient();
  const internalType = toInternalEntityType(entityType);

  const { data, error } = await supabase
    .from("confidence_scores")
    .select("*")
    .eq("entity_type", internalType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load confidence for ${entityType}/${entityId}: ${error.message}`
    );
  }
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    entityType,
    entityId,
    score: (row.score as number | null) ?? null,
    sourceCount: (row.source_count as number | null) ?? 0,
    avgSourceQuality: (row.avg_source_quality as number | null) ?? null,
    lastHumanAuditAt: (row.last_human_audit_at as string | null) ?? null,
    openFlagCount: (row.open_flag_count as number | null) ?? 0,
    recomputedAt: (row.recomputed_at as string | null) ?? null,
  };
}

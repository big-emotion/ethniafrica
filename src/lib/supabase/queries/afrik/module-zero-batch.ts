/**
 * Module #0 N+1 batch helpers (ETNI-24).
 *
 * Public fiche routes need source-transparency data (sources, confidence,
 * flag summary, latest revision) for many peopleIds at once. Naive code
 * issues one query per id (N+1). These helpers batch in single queries
 * (with safe chunking for very large id sets) and return `Map<peopleId, T>`
 * for O(1) caller lookups.
 *
 * Schema assumption: the Module #0 tables reflect the post-014 layout:
 *  - `assertions.source_ids UUID[]` (no FK, no embed possible)
 *  - `sources.tier` (renamed from `type`)
 *  - `confidence_scores` is entity-scoped (`entity_type`, `entity_id`)
 *
 * All helpers:
 *  - short-circuit on empty input (no query),
 *  - chunk `.in(...)` calls when `ids.length` exceeds CHUNK_SIZE to avoid
 *    Supabase URL-size limits,
 *  - log failures through `@/lib/api/logger` (never `console.*`),
 *  - return an empty Map on error so callers never break the page.
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";

export interface Source {
  id: string;
  title: string;
  url: string | null;
  tier: string | null;
}

export interface ConfidenceScore {
  entityId: string;
  score: number;
  sourceCount: number | null;
  avgSourceQuality: number | null;
  lastHumanAuditAt: string | null;
  openFlagCount: number | null;
  recomputedAt: string | null;
}

export interface FlagSummary {
  openCount: number;
  totalCount: number;
}

export interface Revision {
  id: string;
  entityId: string;
  fieldPath: string | null;
  newValue: unknown;
  changedBy: string | null;
  changeReason: string | null;
  createdAt: string;
}

const CLOSED_FLAG_STATUSES = new Set(["resolved", "dismissed"]);

const CHUNK_SIZE = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length <= size) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Sources cited by assertions tied to the given peopleIds.
 *
 * Two-step fetch (post-014 schema: `assertions.source_ids UUID[]`):
 *   1) read `entity_id, source_ids` from `assertions`
 *   2) hydrate `sources` rows for the union of source_ids
 * Results are grouped client-side into Map<peopleId, Source[]>.
 */
export async function getSourcesMap(
  peopleIds: string[]
): Promise<Map<string, Source[]>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const idChunks = chunk(peopleIds, CHUNK_SIZE);

  const assertionRows: Array<{
    entity_id: string;
    source_ids: string[] | null;
  }> = [];

  for (const ids of idChunks) {
    const { data, error } = await supabase
      .from("assertions")
      .select("entity_id, source_ids")
      .in("entity_id", ids);

    if (error) {
      logger.error("module-zero-batch.getSourcesMap failed", error);
      return new Map();
    }
    assertionRows.push(
      ...((data || []) as Array<{
        entity_id: string;
        source_ids: string[] | null;
      }>)
    );
  }

  const allSourceIds = uniqueStrings(
    assertionRows.flatMap((r) => r.source_ids ?? [])
  );

  const sourcesById = new Map<string, Source>();
  if (allSourceIds.length > 0) {
    const sourceIdChunks = chunk(allSourceIds, CHUNK_SIZE);
    for (const sids of sourceIdChunks) {
      const { data, error } = await supabase
        .from("sources")
        .select("id, title, url, tier")
        .in("id", sids);

      if (error) {
        logger.error("module-zero-batch.getSourcesMap failed", error);
        return new Map();
      }
      for (const src of (data || []) as Source[]) {
        sourcesById.set(src.id, src);
      }
    }
  }

  const map = new Map<string, Source[]>();
  for (const row of assertionRows) {
    const ids = row.source_ids ?? [];
    if (ids.length === 0) continue;
    const existing = map.get(row.entity_id) || [];
    for (const sid of ids) {
      const src = sourcesById.get(sid);
      if (src) existing.push(src);
    }
    if (existing.length > 0) map.set(row.entity_id, existing);
  }
  return map;
}

/**
 * Latest confidence score per peopleId.
 *
 * Post-014 schema: `confidence_scores` is entity-scoped. Query directly with
 * (entity_type='people', entity_id IN (...)). First seen non-null per id wins.
 */
export async function getConfidenceMap(
  peopleIds: string[]
): Promise<Map<string, ConfidenceScore>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const idChunks = chunk(peopleIds, CHUNK_SIZE);

  const map = new Map<string, ConfidenceScore>();
  for (const ids of idChunks) {
    const { data, error } = await supabase
      .from("confidence_scores")
      .select(
        "entity_id, score, source_count, avg_source_quality, last_human_audit_at, open_flag_count, recomputed_at"
      )
      .eq("entity_type", "people")
      .in("entity_id", ids);

    if (error) {
      logger.error("module-zero-batch.getConfidenceMap failed", error);
      return new Map();
    }

    for (const row of (data || []) as Array<{
      entity_id: string;
      score: number;
      source_count: number | null;
      avg_source_quality: number | null;
      last_human_audit_at: string | null;
      open_flag_count: number | null;
      recomputed_at: string | null;
    }>) {
      if (map.has(row.entity_id)) continue;
      map.set(row.entity_id, {
        entityId: row.entity_id,
        score: row.score,
        sourceCount: row.source_count,
        avgSourceQuality: row.avg_source_quality,
        lastHumanAuditAt: row.last_human_audit_at,
        openFlagCount: row.open_flag_count,
        recomputedAt: row.recomputed_at,
      });
    }
  }
  return map;
}

/**
 * Per-peopleId flag summary: total flag count and the subset still "open"
 * (status not in {resolved, dismissed}).
 */
export async function getFlagsSummaryMap(
  peopleIds: string[]
): Promise<Map<string, FlagSummary>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const idChunks = chunk(peopleIds, CHUNK_SIZE);

  const map = new Map<string, FlagSummary>();
  for (const ids of idChunks) {
    const { data, error } = await supabase
      .from("flags")
      .select("entity_id, status")
      .in("entity_id", ids);

    if (error) {
      logger.error("module-zero-batch.getFlagsSummaryMap failed", error);
      return new Map();
    }

    for (const row of (data || []) as Array<{
      entity_id: string;
      status: string | null;
    }>) {
      const existing = map.get(row.entity_id) || {
        openCount: 0,
        totalCount: 0,
      };
      existing.totalCount += 1;
      if (!row.status || !CLOSED_FLAG_STATUSES.has(row.status)) {
        existing.openCount += 1;
      }
      map.set(row.entity_id, existing);
    }
  }
  return map;
}

/**
 * Latest revision per peopleId.
 *
 * Single query (per chunk): `revisions` filtered by `entity_id IN (...)`,
 * ordered by `created_at DESC`. First row seen per entity wins.
 */
export async function getLatestRevisionMap(
  peopleIds: string[]
): Promise<Map<string, Revision>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const idChunks = chunk(peopleIds, CHUNK_SIZE);

  const map = new Map<string, Revision>();
  for (const ids of idChunks) {
    const { data, error } = await supabase
      .from("revisions")
      .select(
        "id, entity_id, field_path, new_value, changed_by, change_reason, created_at"
      )
      .order("created_at", { ascending: false })
      .in("entity_id", ids);

    if (error) {
      logger.error("module-zero-batch.getLatestRevisionMap failed", error);
      return new Map();
    }

    for (const row of (data || []) as Array<{
      id: string;
      entity_id: string;
      field_path: string | null;
      new_value: unknown;
      changed_by: string | null;
      change_reason: string | null;
      created_at: string;
    }>) {
      if (map.has(row.entity_id)) continue;
      map.set(row.entity_id, {
        id: row.id,
        entityId: row.entity_id,
        fieldPath: row.field_path,
        newValue: row.new_value,
        changedBy: row.changed_by,
        changeReason: row.change_reason,
        createdAt: row.created_at,
      });
    }
  }
  return map;
}

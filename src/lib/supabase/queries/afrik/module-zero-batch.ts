/**
 * Module #0 N+1 batch helpers (ETNI-24).
 *
 * Public fiche routes need source-transparency data (sources, confidence,
 * flag summary, latest revision) for many peopleIds at once. Naive code
 * issues one query per id (N+1). These helpers each perform exactly ONE
 * Supabase round-trip for N inputs and return `Map<peopleId, T>` for O(1)
 * caller lookups.
 *
 * Schema assumption: the Module #0 tables (sources, assertions,
 * confidence_scores, flags, revisions) follow the 008 layout reconciled by
 * ETNI-22 / migration 014 — every entity row exposes an `entity_id` column
 * referencing the AFRIK people id. If a future migration renames columns,
 * this file is the single place to update.
 *
 * All helpers:
 *  - short-circuit on empty input (no query),
 *  - log failures through `@/lib/api/logger` (never `console.*`),
 *  - return an empty Map on error so callers never break the page.
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";

// ---------------------------------------------------------------------------
// Types — kept local to avoid coupling fiche routes to DB-row shapes. When
// ETNI-22 lands, these can be promoted to `@/types/afrik` if other modules
// need them.
// ---------------------------------------------------------------------------

export interface Source {
  id: string;
  title: string;
  url: string | null;
  type: string | null;
}

export interface ConfidenceScore {
  id: string;
  score: number;
  methodology: string | null;
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

// Flag statuses considered "closed" — anything else counts as open.
const CLOSED_FLAG_STATUSES = new Set(["resolved", "dismissed"]);

/**
 * Sources cited by assertions tied to the given peopleIds.
 *
 * Single query: `assertions` filtered by `entity_id IN (...)`, with the
 * referenced `sources` row embedded via the FK. Grouped client-side.
 */
export async function getSourcesMap(
  peopleIds: string[]
): Promise<Map<string, Source[]>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("assertions")
    .select("entity_id, sources(id, title, url, type)")
    .in("entity_id", peopleIds);

  if (error) {
    logger.error("module-zero-batch.getSourcesMap failed", error);
    return new Map();
  }

  const map = new Map<string, Source[]>();
  for (const row of (data || []) as Array<{
    entity_id: string;
    sources: Source | Source[] | null;
  }>) {
    if (!row.sources) continue;
    const sources = Array.isArray(row.sources) ? row.sources : [row.sources];
    const existing = map.get(row.entity_id) || [];
    for (const src of sources) {
      if (src) existing.push(src);
    }
    map.set(row.entity_id, existing);
  }
  return map;
}

/**
 * Latest confidence score per peopleId.
 *
 * Single query: `assertions` filtered by `entity_id IN (...)`, with the
 * latest `confidence_scores` row embedded. If multiple confidence rows exist
 * we keep the first non-null seen per peopleId; callers can fold further if
 * needed (out of scope for this story).
 */
export async function getConfidenceMap(
  peopleIds: string[]
): Promise<Map<string, ConfidenceScore>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("assertions")
    .select("entity_id, confidence_scores(id, score, methodology)")
    .in("entity_id", peopleIds);

  if (error) {
    logger.error("module-zero-batch.getConfidenceMap failed", error);
    return new Map();
  }

  const map = new Map<string, ConfidenceScore>();
  for (const row of (data || []) as Array<{
    entity_id: string;
    confidence_scores: ConfidenceScore | ConfidenceScore[] | null;
  }>) {
    if (map.has(row.entity_id)) continue;
    if (!row.confidence_scores) continue;
    const cs = Array.isArray(row.confidence_scores)
      ? row.confidence_scores[0]
      : row.confidence_scores;
    if (cs) map.set(row.entity_id, cs);
  }
  return map;
}

/**
 * Per-peopleId flag summary: total flag count and the subset still "open"
 * (status not in {resolved, dismissed}).
 *
 * Single query: `flags` filtered by `entity_id IN (...)`. Aggregation is
 * cheap in-memory because the result set is bounded by the active flags
 * touching the requested peoples.
 */
export async function getFlagsSummaryMap(
  peopleIds: string[]
): Promise<Map<string, FlagSummary>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("flags")
    .select("entity_id, status")
    .in("entity_id", peopleIds);

  if (error) {
    logger.error("module-zero-batch.getFlagsSummaryMap failed", error);
    return new Map();
  }

  const map = new Map<string, FlagSummary>();
  for (const row of (data || []) as Array<{
    entity_id: string;
    status: string | null;
  }>) {
    const existing = map.get(row.entity_id) || { openCount: 0, totalCount: 0 };
    existing.totalCount += 1;
    if (!row.status || !CLOSED_FLAG_STATUSES.has(row.status)) {
      existing.openCount += 1;
    }
    map.set(row.entity_id, existing);
  }
  return map;
}

/**
 * Latest revision per peopleId.
 *
 * Single query: `revisions` filtered by `entity_id IN (...)`, ordered by
 * `created_at DESC`. The first row seen per entity wins — guaranteed to be
 * the most recent given the order clause.
 */
export async function getLatestRevisionMap(
  peopleIds: string[]
): Promise<Map<string, Revision>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("revisions")
    .select(
      "id, entity_id, field_path, new_value, changed_by, change_reason, created_at"
    )
    .order("created_at", { ascending: false })
    .in("entity_id", peopleIds);

  if (error) {
    logger.error("module-zero-batch.getLatestRevisionMap failed", error);
    return new Map();
  }

  const map = new Map<string, Revision>();
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
  return map;
}

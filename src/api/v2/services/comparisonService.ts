/**
 * Comparison service — batched reads for the compare feature (FR59, FR60, AR17).
 *
 * Fetches 2-3 same-type entities plus their confidence rows in exactly two
 * Supabase round-trips (one entity read, one confidence read), so assembling
 * a comparison stays N+1-free. snake_case DB rows are mapped to the camelCase
 * `CompareEntityPayload` shape here — nothing snake_case leaks past this file.
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getConfidenceMap,
  type ConfidenceScore,
} from "@/lib/supabase/queries/afrik/module-zero-batch";
import type { CompareEntityPayload, CompareEntityType } from "@/types/compare";

const TABLE_BY_TYPE: Record<CompareEntityType, string> = {
  peuple: "afrik_peoples",
  pays: "afrik_countries",
  famille: "afrik_language_families",
};

const CONFIDENCE_ENTITY_TYPE_BY_TYPE: Record<CompareEntityType, string> = {
  peuple: "people",
  pays: "country",
  famille: "language_family",
};

const LABEL_COLUMN_BY_TYPE: Record<CompareEntityType, string> = {
  peuple: "name_main",
  pays: "name_fr",
  famille: "name_fr",
};

export interface ComparisonEntityResult {
  id: string;
  entity: CompareEntityPayload;
  confidence: ConfidenceScore | null;
}

export interface ComparisonEntitiesResult {
  entities: ComparisonEntityResult[];
  missingIds: string[];
}

function mapRowToEntity(
  type: CompareEntityType,
  row: Record<string, unknown>
): CompareEntityPayload {
  const content = (row.content as Record<string, unknown>) || {};
  return {
    ...content,
    type,
    id: row.id as string,
    label: row[LABEL_COLUMN_BY_TYPE[type]] as string,
  } as CompareEntityPayload;
}

/**
 * Fetch 2-3 same-type comparison entities plus their confidence rows.
 * IDs with no matching row are surfaced in `missingIds` (never dropped
 * silently), so the handler can emit 404 NOT_FOUND naming them.
 */
// @req REQ-097
export async function getComparisonEntities(
  type: CompareEntityType,
  ids: string[]
): Promise<ComparisonEntitiesResult> {
  if (ids.length === 0) {
    return { entities: [], missingIds: [] };
  }

  const supabase = createServerClient();
  const table = TABLE_BY_TYPE[type];

  const { data, error } = await supabase.from(table).select("*").in("id", ids);

  if (error) {
    logger.error("comparisonService.getComparisonEntities failed", error);
    return { entities: [], missingIds: [...ids] };
  }

  const rowsById = new Map(
    ((data || []) as Array<Record<string, unknown>>).map((row) => [
      row.id as string,
      row,
    ])
  );

  const foundIds = ids.filter((id) => rowsById.has(id));
  const missingIds = ids.filter((id) => !rowsById.has(id));

  const confidenceMap = await getConfidenceMap(
    foundIds,
    CONFIDENCE_ENTITY_TYPE_BY_TYPE[type]
  );

  const entities: ComparisonEntityResult[] = foundIds.map((id) => ({
    id,
    entity: mapRowToEntity(type, rowsById.get(id)!),
    confidence: confidenceMap.get(id) ?? null,
  }));

  return { entities, missingIds };
}

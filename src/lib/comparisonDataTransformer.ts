/**
 * Comparison Data Transformer
 *
 * Pure transformer turning 2–3 same-type fiche payloads into aligned
 * comparison columns and rows (FR59, FR61). No I/O, no computed/derived
 * values — comparison is presentational alignment of cited fiche data only.
 */

import {
  COMPARABLE_ROWS,
  ComparisonInputError,
  type CompareEntityPayload,
  type ComparisonColumn,
  type ComparisonPageData,
  type ComparisonRow,
} from "@/types/compare";

function validateEntities(entities: CompareEntityPayload[]): void {
  if (entities.length < 2 || entities.length > 3) {
    throw new ComparisonInputError(
      "INVALID_COUNT",
      `Comparison requires 2 to 3 entities, got ${entities.length}`
    );
  }

  const types = new Set(entities.map((entity) => entity.type));
  if (types.size > 1) {
    throw new ComparisonInputError(
      "MIXED_TYPES",
      "All compared entities must be of the same type"
    );
  }

  const ids = entities.map((entity) => entity.id);
  if (new Set(ids).size !== ids.length) {
    throw new ComparisonInputError(
      "DUPLICATE_IDS",
      "Compared entities must have distinct ids"
    );
  }
}

// @req REQ-097 REQ-098
export function transformComparisonData(
  entities: CompareEntityPayload[]
): ComparisonPageData {
  validateEntities(entities);

  const type = entities[0].type;

  const columns: ComparisonColumn[] = entities.map((entity) => ({
    id: entity.id,
    label: entity.label,
    type: entity.type,
  }));

  const rows: ComparisonRow[] = [];

  for (const key of COMPARABLE_ROWS[type]) {
    const values: Record<string, unknown | null> = {};
    let hasValue = false;

    for (const entity of entities) {
      const value = (entity as unknown as Record<string, unknown>)[key] ?? null;
      values[entity.id] = value;
      if (value !== null) hasValue = true;
    }

    if (hasValue) {
      rows.push({ key, values });
    }
  }

  return { type, columns, rows };
}

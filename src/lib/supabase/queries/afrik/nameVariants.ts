import { logger } from "@/lib/api/logger";
import type { PatronymeId } from "@/types/names";

import { createServerClient } from "../../server";

interface PatronymeNameRecordRow {
  entity_id: string;
}

function isPatronymeId(value: string): value is PatronymeId {
  return /^PAT_[A-Z0-9_]+$/.test(value);
}

// @req REQ-135
export class DeclaredNameVariantGapError extends Error {
  readonly spelling: string;
  readonly expectedCanonical: string;

  constructor(spelling: string, expectedCanonical: string) {
    super(
      `Required declared spelling "${spelling}" is missing for canonical patronyme "${expectedCanonical}".`
    );
    this.name = "DeclaredNameVariantGapError";
    this.spelling = spelling;
    this.expectedCanonical = expectedCanonical;
  }
}

/**
 * Resolves a declared patronyme spelling before any relation join occurs.
 */
// @req REQ-135
export async function resolvePatronymeIdsBySpelling(
  spelling: string
): Promise<PatronymeId[]> {
  const normalizedSpelling = spelling.trim();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("name_records")
    .select("entity_id")
    .eq("entity_type", "patronyme")
    .ilike("name_text", normalizedSpelling);

  if (error) {
    logger.error("Failed to resolve declared patronyme spelling", error, {
      spelling: normalizedSpelling,
    });
    throw new Error(
      `Failed to resolve patronyme spelling "${normalizedSpelling}": ${error.message}`
    );
  }

  const ids = (data ?? []) as PatronymeNameRecordRow[];
  return [...new Set(ids.map((row) => row.entity_id).filter(isPatronymeId))];
}

/**
 * Resolves a spelling that a reference dataset declares as mandatory.
 */
// @req REQ-135
export async function resolveRequiredPatronymeIdsBySpelling(
  spelling: string,
  expectedCanonical: string
): Promise<PatronymeId[]> {
  const ids = await resolvePatronymeIdsBySpelling(spelling);

  if (ids.length === 0) {
    throw new DeclaredNameVariantGapError(spelling.trim(), expectedCanonical);
  }

  return ids;
}

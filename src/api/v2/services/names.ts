/**
 * Names Atlas service (Epic 8, FR53-FR58). Shared by `GET /v2/peoples/{id}/names`
 * (Story 8.6) and `GET /v2/names` (Story 8.7).
 *
 * `getPeopleNamesDossier` batches its joins per AR17 (map pattern, one query
 * per relation set, no per-record queries):
 *   1) one `name_records` query for the people's dossier rows
 *   2) one `assertions` query for the union of their assertion ids
 *   3) one `sources` query for the union of cited source ids
 *   4) one `getConfidenceMap` call (entity-scoped, shared with other Module 0
 *      consumers) for the people's confidence score
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import { getConfidenceMap } from "@/lib/supabase/queries/afrik/module-zero-batch";
import type {
  NameRecordConfidenceView,
  NameRecordImposition,
  NameRecordSourceView,
  NameRecordType,
  PeopleNameRecord,
  PeopleNamesDossier,
} from "@/api/v2/schemas/names";

export class PeopleNamesNotFoundError extends Error {
  constructor(peopleId: string) {
    super(`People not found: ${peopleId}`);
    this.name = "PeopleNamesNotFoundError";
  }
}

interface NameRecordRow {
  id: string;
  name_text: string;
  name_type: NameRecordType;
  language_of_origin: string | null;
  meaning: string | null;
  period_label: string | null;
  imposed_by: string | null;
  imposition_period: string | null;
  why_problematic: string | null;
  contemporary_usage: string | null;
  assertion_id: string;
  sort_rank: number;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildImposition(row: NameRecordRow): NameRecordImposition | null {
  if (
    !row.imposed_by &&
    !row.imposition_period &&
    !row.why_problematic &&
    !row.contemporary_usage
  ) {
    return null;
  }
  return {
    imposedBy: row.imposed_by,
    impositionPeriod: row.imposition_period,
    whyProblematic: row.why_problematic,
    contemporaryUsage: row.contemporary_usage,
  };
}

/**
 * Sources cited by the assertions backing a set of name_records. Two-step
 * fetch mirroring the module-zero-batch.getSourcesMap pattern (AR17), keyed
 * by assertion_id rather than peopleId since each name record has its own
 * per-field assertion (not the people-wide assertion bag getSourcesMap
 * returns).
 */
async function getSourcesByAssertionId(
  supabase: ReturnType<typeof createServerClient>,
  assertionIds: string[]
): Promise<Map<string, NameRecordSourceView[]>> {
  const map = new Map<string, NameRecordSourceView[]>();
  if (assertionIds.length === 0) return map;

  const { data: assertionRows, error: assertionError } = await supabase
    .from("assertions")
    .select("id, source_ids")
    .in("id", assertionIds);

  if (assertionError) {
    throw new Error(
      `Failed to load assertions for names: ${assertionError.message}`
    );
  }

  const rows = (assertionRows ?? []) as Array<{
    id: string;
    source_ids: string[] | null;
  }>;

  const allSourceIds = uniqueStrings(
    rows.flatMap((row) => row.source_ids ?? [])
  );

  const sourcesById = new Map<string, NameRecordSourceView>();
  if (allSourceIds.length > 0) {
    const { data: sourceRows, error: sourcesError } = await supabase
      .from("sources")
      .select("id, title, url, year, tier")
      .in("id", allSourceIds);

    if (sourcesError) {
      throw new Error(`Failed to load sources: ${sourcesError.message}`);
    }

    for (const source of (sourceRows ?? []) as NameRecordSourceView[]) {
      sourcesById.set(source.id, source);
    }
  }

  for (const row of rows) {
    const ids = row.source_ids ?? [];
    const sources = ids
      .map((id) => sourcesById.get(id))
      .filter((s): s is NameRecordSourceView => Boolean(s));
    map.set(row.id, sources);
  }

  return map;
}

export async function getPeopleNamesDossier(
  peopleId: string
): Promise<PeopleNamesDossier> {
  const supabase = createServerClient();

  const { data: peopleRow, error: peopleError } = await supabase
    .from("afrik_peoples")
    .select("id, content")
    .eq("id", peopleId)
    .maybeSingle();

  if (peopleError) {
    throw new Error(
      `Failed to load people ${peopleId}: ${peopleError.message}`
    );
  }
  if (!peopleRow) {
    throw new PeopleNamesNotFoundError(peopleId);
  }

  const content = ((peopleRow as { content?: unknown }).content ??
    {}) as Record<string, unknown>;
  const appellations = (content.appellations ?? {}) as {
    selfAppellation?: string;
  };

  const { data: nameRows, error: namesError } = await supabase
    .from("name_records")
    .select(
      "id, name_text, name_type, language_of_origin, meaning, period_label, imposed_by, imposition_period, why_problematic, contemporary_usage, assertion_id, sort_rank"
    )
    .eq("entity_type", "people")
    .eq("entity_id", peopleId)
    .order("sort_rank", { ascending: true })
    .order("name_type", { ascending: true })
    .order("name_text", { ascending: true });

  if (namesError) {
    logger.error("names.getPeopleNamesDossier failed", namesError, {
      peopleId,
    });
    throw new Error(
      `Failed to load names for ${peopleId}: ${namesError.message}`
    );
  }

  const rows = (nameRows ?? []) as NameRecordRow[];
  const assertionIds = uniqueStrings(rows.map((row) => row.assertion_id));

  const [sourcesByAssertion, confidenceMap] = await Promise.all([
    getSourcesByAssertionId(supabase, assertionIds),
    getConfidenceMap([peopleId]),
  ]);

  const confidenceScore = confidenceMap.get(peopleId);
  const confidence: NameRecordConfidenceView | null = confidenceScore
    ? {
        score: confidenceScore.score,
        recomputedAt: confidenceScore.recomputedAt,
      }
    : null;

  const names: PeopleNameRecord[] = rows.map((row) => ({
    id: row.id,
    nameText: row.name_text,
    nameType: row.name_type,
    languageOfOrigin: row.language_of_origin,
    meaning: row.meaning,
    periodLabel: row.period_label,
    imposition: buildImposition(row),
    assertionId: row.assertion_id,
    sources: sourcesByAssertion.get(row.assertion_id) ?? [],
    confidence,
  }));

  return {
    peopleId,
    autonym: appellations.selfAppellation ?? null,
    names,
  };
}

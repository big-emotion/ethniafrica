/**
 * Names service — Supabase queries for the `name_records` table (Epic 8).
 *
 * Filters q?, nameType?, imposedOnly?, peopleId?, letter? against
 * `name_records`, batches the people summary + confidence-boost lookups
 * (AR17 map pattern — one query per relation set, no per-record queries).
 */

import { createServerClient } from "@/lib/supabase/server";
import type {
  ListNamesQuery,
  NameRecord,
  PeopleSummary,
} from "@/api/v2/schemas/names";

export interface ListNamesResult {
  names: NameRecord[];
  total: number;
}

function mapPeopleRowToSummary(row: Record<string, unknown>): PeopleSummary {
  const content = (row.content as Record<string, unknown>) ?? {};
  const appellations = content.appellations as
    | Record<string, unknown>
    | undefined;
  const autonym =
    typeof appellations?.selfAppellation === "string"
      ? appellations.selfAppellation
      : null;

  return {
    id: row.id as string,
    nameMain: row.name_main as string,
    autonym,
    slug: row.id as string,
  };
}

function mapRowToNameRecord(
  row: Record<string, unknown>,
  peopleMap: Map<string, PeopleSummary>
): NameRecord {
  const peopleId = row.entity_id as string;

  return {
    id: row.id as string,
    peopleId,
    nameText: row.name_text as string,
    nameType: row.name_type as NameRecord["nameType"],
    languageOfOrigin: (row.language_of_origin as string | null) ?? null,
    meaning: (row.meaning as string | null) ?? null,
    periodLabel: (row.period_label as string | null) ?? null,
    imposedBy: (row.imposed_by as string | null) ?? null,
    impositionPeriod: (row.imposition_period as string | null) ?? null,
    whyProblematic: (row.why_problematic as string | null) ?? null,
    contemporaryUsage: (row.contemporary_usage as string | null) ?? null,
    sortRank: row.sort_rank as number,
    people: peopleMap.get(peopleId) ?? null,
  };
}

// @req FR53 @req FR55 @req FR58
export async function listNames(
  query: ListNamesQuery
): Promise<ListNamesResult> {
  const supabase = createServerClient();

  let dbQuery = supabase
    .from("name_records")
    .select("*", { count: "exact" })
    .eq("entity_type", "people");

  if (query.q) {
    dbQuery = dbQuery.textSearch("search_vector", query.q, {
      type: "websearch",
      config: "french",
    });
  }
  if (query.nameType) {
    dbQuery = dbQuery.eq("name_type", query.nameType);
  }
  if (query.imposedOnly) {
    dbQuery = dbQuery.not("imposed_by", "is", null);
  }
  if (query.peopleId) {
    dbQuery = dbQuery.eq("entity_id", query.peopleId);
  }
  if (query.letter) {
    dbQuery = dbQuery.ilike("name_text", `${query.letter}%`);
  }

  const { data, error, count } = await dbQuery
    .order("sort_rank")
    .order("name_text")
    .range(query.offset, query.offset + query.limit - 1);

  if (error) {
    throw new Error(`Failed to list name records: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const peopleIds = [...new Set(rows.map((row) => row.entity_id as string))];

  // ── batched people summary lookup (AR17 map pattern) ──────────────────────
  const peopleMap = new Map<string, PeopleSummary>();
  if (peopleIds.length > 0) {
    const { data: peopleRows, error: peopleError } = await supabase
      .from("afrik_peoples")
      .select("id, name_main, content")
      .in("id", peopleIds);

    if (peopleError) {
      throw new Error(
        `Failed to load people summaries: ${peopleError.message}`
      );
    }
    for (const row of peopleRows ?? []) {
      peopleMap.set(row.id as string, mapPeopleRowToSummary(row));
    }
  }

  let names = rows.map((row) => mapRowToNameRecord(row, peopleMap));

  // ── confidence boost (ts_rank_cd × confidence, search.ts convention) ──────
  if (query.q && peopleIds.length > 0) {
    const { data: scoreRows } = await supabase
      .from("confidence_scores")
      .select("entity_id, score")
      .eq("entity_type", "people")
      .in("entity_id", peopleIds);

    const confidenceMap = new Map<string, number>();
    for (const row of scoreRows ?? []) {
      if (row.score !== null) confidenceMap.set(row.entity_id, row.score);
    }

    names = [...names].sort(
      (a, b) =>
        (confidenceMap.get(b.peopleId) ?? -1) -
        (confidenceMap.get(a.peopleId) ?? -1)
    );
  }

  return { names, total: count ?? rows.length };
}

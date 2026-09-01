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
 *
 * `listNames` filters q?, nameType?, imposedOnly?, peopleId?, letter? against
 * `name_records`, batches the people summary + confidence-boost lookups
 * (AR17 map pattern — one query per relation set, no per-record queries).
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import { getConfidenceMap } from "@/lib/supabase/queries/afrik/module-zero-batch";
import type {
  ListNameFormsQuery,
  ListNamesQuery,
  NameForm,
  NameRecord,
  NameRecordConfidenceView,
  NameRecordImposition,
  NameRecordSourceView,
  NameRecordType,
  PeopleNameRecord,
  PeopleNamesDossier,
  PeopleSummary,
} from "@/api/v2/schemas/names";

// @req REQ-057
export class PeopleNamesNotFoundError extends Error {
  constructor(peopleId: string) {
    super(`People not found: ${peopleId}`);
    this.name = "PeopleNamesNotFoundError";
  }
}

// @req REQ-057
export class NamesSchemaUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NamesSchemaUnavailableError";
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

// @req REQ-057
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
// @req REQ-057
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
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.code === "42P17"
    ) {
      throw new NamesSchemaUnavailableError(
        `Names schema is unavailable: ${error.message}`
      );
    }
    logger.error("names.listNames failed", error);
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

  // ── confidence-only ordering ──────────────────────────────────────────────
  // This sorts by confidence alone, in JavaScript, over the current page. It
  // is NOT the ts_rank_cd × confidence ranking the comment here used to claim
  // — that never existed anywhere. /api/v2/search now ranks in Postgres
  // (migrations 043/044); this endpoint has not been moved yet, and saying so
  // is what keeps the next reader from citing it as precedent.
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

/**
 * Folds a reader's query the same way `afrik_name_forms.form_key` is folded.
 *
 * The view groups on `lower(afrik_unaccent(name_text))`, so a query that is
 * not folded identically can only match by luck — "Traoré" would miss the
 * corpus's own "Traore". `%` and `_` are escaped because they are `ILIKE`
 * wildcards, and a reader typing one means the character, not the operator.
 */
function foldNameQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\\%_]/g, (character) => `\\${character}`);
}

export interface ListNameFormsResult {
  forms: NameForm[];
  total: number;
  pageCount: number;
}

function mapRowToNameForm(row: Record<string, unknown>): NameForm {
  return {
    formKey: row.form_key as string,
    displayName: row.display_name as string,
    spellings: (row.spellings as string[]) ?? [],
    nameTypes: (row.name_types as NameForm["nameTypes"]) ?? [],
    bearerCount: (row.bearer_count as number) ?? 0,
    bearers: (row.bearers as NameForm["bearers"]) ?? [],
    hasImposed: Boolean(row.has_imposed),
    whyProblematic: (row.why_problematic as string | null) ?? null,
    languageOfOrigin: (row.language_of_origin as string | null) ?? null,
  };
}

/**
 * One page of the Appellations nomenclature.
 *
 * Reads `afrik_name_forms` rather than `name_records`: the surface's unit is
 * the name, and a page can only group what it has already fetched, so
 * grouping the records here — after `range()` — would have produced a
 * different set of entries on every page. Ordering is alphabetical on the
 * folded key rather than on `sort_rank`, which used to sink the 2742 exonyms
 * behind 742 rank-0 endonyms.
 */
// @req REQ-054
export async function listNameForms(
  query: ListNameFormsQuery
): Promise<ListNameFormsResult> {
  const supabase = createServerClient();
  const offset = (query.page - 1) * query.perPage;

  let dbQuery = supabase
    .from("afrik_name_forms")
    .select("*", { count: "exact" });

  if (query.q) {
    dbQuery = dbQuery.ilike("form_key", `%${foldNameQuery(query.q)}%`);
  }
  if (query.nameType) {
    dbQuery = dbQuery.contains("name_types", [query.nameType]);
  }
  if (query.imposedOnly) {
    dbQuery = dbQuery.eq("has_imposed", true);
  }

  const { data, error, count } = await dbQuery
    .order("form_key")
    .range(offset, offset + query.perPage - 1);

  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.code === "42P17"
    ) {
      throw new NamesSchemaUnavailableError(
        `Name forms view is unavailable: ${error.message}`
      );
    }
    logger.error("names.listNameForms failed", error);
    throw new Error(`Failed to list name forms: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const total = count ?? rows.length;

  return {
    forms: rows.map(mapRowToNameForm),
    total,
    pageCount: Math.max(1, Math.ceil(total / query.perPage)),
  };
}

export interface NameTypeCounts {
  byType: Partial<Record<NameRecordType, number>>;
  imposed: number;
}

/**
 * How many records each filter can reach, so the surface can stop offering
 * one that reaches none.
 *
 * A type absent from the corpus is absent from the returned map rather than
 * present at zero: the caller renders what it is given, and an explicit zero
 * would only move the decision to drop the chip back into the component.
 */
// @req REQ-054
export async function getNameTypeCounts(): Promise<NameTypeCounts> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("afrik_name_type_counts")
    .select("name_type, record_count, imposed_count");

  if (error) {
    // A missing facet view costs the chips, never the nomenclature itself.
    logger.error("names.getNameTypeCounts failed", error);
    return { byType: {}, imposed: 0 };
  }

  const counts: NameTypeCounts = { byType: {}, imposed: 0 };
  for (const row of (data ?? []) as Array<{
    name_type: NameRecordType;
    record_count: number;
    imposed_count: number;
  }>) {
    if (row.record_count > 0) {
      counts.byType[row.name_type] = row.record_count;
    }
    counts.imposed += row.imposed_count ?? 0;
  }

  return counts;
}

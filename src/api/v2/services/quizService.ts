/**
 * Quiz service — scope catalogue + serve-time session composer.
 *
 * Story 10.6 (ETNI-495), FR65/FR66/AR17. `getQuizScopeCatalogue()` counts the
 * active bank per country and per language family, so the picker can say what
 * each track really holds and refuse to launch an empty one.
 * `composeQuizSession()` draws a batch for one scope, orders it by the games
 * charter's difficulty ladder, then re-validates every drawn question against
 * *current* confidence scores, open flags and source state through the shared
 * `isQuizEligible` gate (10.3) — batched, never N+1 — so a question that has
 * decayed since the last generation sweep never reaches a player between
 * sweeps.
 *
 * The audience segments this file used to serve are gone; see
 * `src/lib/quiz/quizScope.ts` for what replaced them and why.
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getConfidenceMap,
  getFlagsSummaryMap,
} from "@/lib/supabase/queries/afrik/module-zero-batch";
import {
  isQuizEligible,
  toQuizConfidenceScore,
  type QuizAssertionSource,
} from "@/lib/quiz/eligibility";
import { toSourceTier } from "@/types/sources";
import {
  bandSubjectsByPopulation,
  composeLadder,
  sessionBandPlan,
  type QuizScope,
} from "@/lib/quiz/quizScope";
import { TEMPLATE_FIELD_PATHS } from "@/lib/quiz/segmentPolicy";
import type {
  QuizEntityType,
  QuizOptionValue,
  QuizTemplateId,
} from "@/types/quiz";

/**
 * Rows per page when walking a table PostgREST would otherwise silently cap.
 * Kept under its 1000-row ceiling: a page the server truncated would be short,
 * and a short page is how the walk knows it has reached the end.
 */
const PAGE_SIZE = 500;

/** The corpus is ~800 peoples and ~4000 questions; this bound cannot be reached honestly. */
const MAX_PAGES = 60;

/**
 * Characters of `.in(...)` filter per request. A count is the wrong unit — 500
 * people ids is 7 KB of URL and 500 UUIDs is 19 KB, and the server rejects the
 * long one with a bare 400. Mirrors `scripts/lib/supabasePaging.ts`.
 */
const FILTER_BUDGET = 8000;

export interface QuizScopeOption {
  id: string;
  labelFr: string;
  activeQuestionCount: number;
}

export interface QuizScopeCatalogue {
  countries: QuizScopeOption[];
  families: QuizScopeOption[];
  /** Every active question, whatever its subject — what `mixed` and `random` draw from. */
  totalActiveQuestionCount: number;
}

export interface ComposeQuizSessionParams {
  scope: QuizScope;
  count: number;
}

export interface QuizSessionQuestion {
  id: string;
  templateId: QuizTemplateId;
  difficulty: number;
  entityType: QuizEntityType;
  entityId: string;
  fieldPath: string;
  promptFr: string;
  optionsFr: QuizOptionValue[];
  correctOption: number;
  explanationFr: string;
  assertionId: string;
  sourceIds: string[];
}

interface QuizQuestionRow {
  id: string;
  template_id: QuizTemplateId;
  difficulty: number;
  entity_type: QuizEntityType;
  entity_id: string;
  field_path: string;
  prompt_fr: string;
  options_fr: QuizOptionValue[];
  correct_option: number;
  explanation_fr: string;
  assertion_id: string;
  source_ids: string[] | null;
}

interface SourceGateRow {
  id: string;
  tier: string | null;
  verified_at: string | null;
}

/** Just enough of a question to band it, order it and drop it — no prose travels. */
interface CandidateRow {
  id: string;
  entity_id: string;
  field_path: string;
  options_fr: QuizOptionValue[];
  correct_option: number;
}

interface DemographyRow {
  id: string;
  demography: {
    totalPopulation?: number;
    distributionByCountry?: Array<{ country?: string; population?: number }>;
  } | null;
}

const QUIZ_QUESTION_COLUMNS =
  "id, template_id, difficulty, entity_type, entity_id, field_path, prompt_fr, options_fr, correct_option, explanation_fr, assertion_id, source_ids";

/** Splits ids so the resulting `.in(...)` filter fits the URL, whatever their length. */
function chunkForUrl(ids: string[]): string[][] {
  if (ids.length === 0) return [];
  const longest = ids.reduce((max, id) => Math.max(max, id.length), 0);
  const size = Math.max(1, Math.floor(FILTER_BUDGET / (longest + 3)));
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

async function readAllPages<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < MAX_PAGES; index += 1) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) {
      logger.error(`quizService.${label} failed`, error);
      return rows;
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  logger.error(`quizService.${label} exceeded ${MAX_PAGES} pages — truncated`);
  return rows;
}

/**
 * Counts the active bank per country and per family.
 *
 * Counted by walking the bank's entity ids and the two membership tables, not
 * by one `head` request per option: 54 countries plus 23 families is 77
 * round-trips against three paged reads, and the counts have to agree with the
 * pool a session actually draws from — which is a join, not a column.
 */
// @req REQ-103
export async function getQuizScopeCatalogue(): Promise<QuizScopeCatalogue> {
  const supabase = createServerClient();

  const [questionRows, peopleRows, membershipRows, countryRows, familyRows] =
    await Promise.all([
      readAllPages<{ entity_id: string }>("scopeCatalogue.questions", (f, t) =>
        supabase
          .from("quiz_questions")
          .select("entity_id")
          .is("revoked_at", null)
          .range(f, t)
      ),
      readAllPages<{ id: string; language_family_id: string | null }>(
        "scopeCatalogue.peoples",
        (f, t) =>
          supabase
            .from("afrik_peoples")
            .select("id, language_family_id")
            .range(f, t)
      ),
      readAllPages<{ people_id: string; country_id: string }>(
        "scopeCatalogue.membership",
        (f, t) =>
          supabase
            .from("afrik_people_countries")
            .select("people_id, country_id")
            .range(f, t)
      ),
      readAllPages<{ id: string; name_fr: string }>(
        "scopeCatalogue.countries",
        (f, t) =>
          supabase.from("afrik_countries").select("id, name_fr").range(f, t)
      ),
      readAllPages<{ id: string; name_fr: string }>(
        "scopeCatalogue.families",
        (f, t) =>
          supabase
            .from("afrik_language_families")
            .select("id, name_fr")
            .range(f, t)
      ),
    ]);

  const questionsBySubject = new Map<string, number>();
  for (const row of questionRows) {
    questionsBySubject.set(
      row.entity_id,
      (questionsBySubject.get(row.entity_id) ?? 0) + 1
    );
  }

  const byCountry = new Map<string, number>();
  for (const row of membershipRows) {
    const held = questionsBySubject.get(row.people_id) ?? 0;
    if (held === 0) continue;
    byCountry.set(row.country_id, (byCountry.get(row.country_id) ?? 0) + held);
  }

  const byFamily = new Map<string, number>();
  for (const row of peopleRows) {
    if (!row.language_family_id) continue;
    const held = questionsBySubject.get(row.id) ?? 0;
    if (held === 0) continue;
    byFamily.set(
      row.language_family_id,
      (byFamily.get(row.language_family_id) ?? 0) + held
    );
  }

  const byLabel = (a: QuizScopeOption, b: QuizScopeOption) =>
    a.labelFr.localeCompare(b.labelFr, "fr");

  return {
    countries: countryRows
      .map((row) => ({
        id: row.id,
        labelFr: row.name_fr,
        activeQuestionCount: byCountry.get(row.id) ?? 0,
      }))
      .sort(byLabel),
    families: familyRows
      .map((row) => ({
        id: row.id,
        labelFr: row.name_fr,
        activeQuestionCount: byFamily.get(row.id) ?? 0,
      }))
      .sort(byLabel),
    totalActiveQuestionCount: questionRows.length,
  };
}

/**
 * The corpus name of the entity a scope points at, or null when nothing of
 * that id exists.
 *
 * One indexed lookup rather than `getQuizScopeCatalogue()`, which walks five
 * tables: composing a session and rendering a share card both need the name and
 * neither needs the counts, and the catalogue's cost belongs to the picker that
 * displays them. Null is also the existence check the 422 branch reads.
 */
// @req REQ-103
export async function getQuizScopeLabel(
  scope: QuizScope
): Promise<string | null> {
  if (scope.kind === "mixed" || scope.kind === "random") return null;
  if (!scope.entityId) return null;

  const supabase = createServerClient();
  const table =
    scope.kind === "country" ? "afrik_countries" : "afrik_language_families";

  const { data, error } = await supabase
    .from(table)
    .select("name_fr")
    .eq("id", scope.entityId)
    .maybeSingle();

  if (error) {
    logger.error("quizService.getQuizScopeLabel failed", error);
    return null;
  }
  return (data?.name_fr as string | undefined) ?? null;
}

/** The peoples a scope covers, or null for the scopes that cover the corpus. */
async function resolveScopedSubjects(
  supabase: ReturnType<typeof createServerClient>,
  scope: QuizScope
): Promise<string[] | null> {
  if (scope.kind === "country" && scope.entityId) {
    const rows = await readAllPages<{ people_id: string }>(
      "resolveScopedSubjects.country",
      (f, t) =>
        supabase
          .from("afrik_people_countries")
          .select("people_id")
          .eq("country_id", scope.entityId)
          .range(f, t)
    );
    return rows.map((row) => row.people_id);
  }

  if (scope.kind === "family" && scope.entityId) {
    const rows = await readAllPages<{ id: string }>(
      "resolveScopedSubjects.family",
      (f, t) =>
        supabase
          .from("afrik_peoples")
          .select("id")
          .eq("language_family_id", scope.entityId)
          .range(f, t)
    );
    return rows.map((row) => row.id);
  }

  return null;
}

async function fetchCandidates(
  supabase: ReturnType<typeof createServerClient>,
  subjectIds: string[] | null
): Promise<CandidateRow[]> {
  const columns = "id, entity_id, field_path, options_fr, correct_option";

  if (subjectIds === null) {
    return readAllPages<CandidateRow>("fetchCandidates.all", (f, t) =>
      supabase
        .from("quiz_questions")
        .select(columns)
        .is("revoked_at", null)
        .range(f, t)
    );
  }
  if (subjectIds.length === 0) return [];

  const chunks = await Promise.all(
    chunkForUrl(subjectIds).map((idChunk) =>
      readAllPages<CandidateRow>("fetchCandidates.scoped", (f, t) =>
        supabase
          .from("quiz_questions")
          .select(columns)
          .is("revoked_at", null)
          .in("entity_id", idChunk)
          .range(f, t)
      )
    )
  );
  return chunks.flat();
}

/**
 * `content.demography` for the scoped subjects — the population the ladder
 * bands on, and the country shares the T3 filter below needs.
 *
 * Selected as one JSON path rather than the whole `content` column: a people
 * fiche is a large document and the ladder needs two numbers out of it.
 */
async function fetchDemography(
  supabase: ReturnType<typeof createServerClient>,
  subjectIds: string[] | null
): Promise<Map<string, DemographyRow["demography"]>> {
  const columns = "id, demography:content->demography";

  // `content->demography` types as the generic `Json`, since PostgREST cannot
  // tell the client what shape lives at a JSON path. The cast names the shape
  // the strict fiche model guarantees there.
  const readPage = (idChunk: string[] | null) =>
    readAllPages<DemographyRow>("fetchDemography", (from, to) => {
      const query = supabase.from("afrik_peoples").select(columns);
      return (idChunk
        ? query.in("id", idChunk).range(from, to)
        : query.range(from, to)) as unknown as PromiseLike<
        PageResult<DemographyRow>
      >;
    });

  const rows =
    subjectIds === null
      ? await readPage(null)
      : (await Promise.all(chunkForUrl(subjectIds).map(readPage))).flat();

  return new Map(rows.map((row) => [row.id, row.demography]));
}

/**
 * Fisher-Yates over the queried pool. PostgREST has no `ORDER BY random()`
 * escape hatch without an RPC (none exists for this table), so the draw is
 * shuffled in-process — still a single round-trip, matching the bank-scale
 * KISS choice documented in the Epic 10 spec.
 */
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function optionLabel(option: QuizOptionValue): string {
  return typeof option === "string" ? option : option.autonym;
}

/**
 * Drops the T3 rounds a country track would answer for the player.
 *
 * « Dans quel pays le peuple X est-il principalement présent ? », asked inside
 * « les peuples du Ghana », answers Ghana for 48 % of the corpus's country
 * memberships — measured, not estimated. A round winnable from the title of
 * the session it is in fails the charter's kill test, so it is not served.
 *
 * The other half survives and is the better half: a people the scope claims
 * whose centre of gravity is a country away is exactly the thing a colonial
 * border did, and the reveal says so.
 */
function withoutSelfAnsweringCountryRounds(
  candidates: CandidateRow[],
  scope: QuizScope,
  countryNameFr: string | null
): CandidateRow[] {
  if (scope.kind !== "country" || !countryNameFr) return candidates;
  return candidates.filter((candidate) => {
    if (candidate.field_path !== TEMPLATE_FIELD_PATHS.T3) return true;
    const answer = candidate.options_fr?.[candidate.correct_option];
    return answer === undefined || optionLabel(answer) !== countryNameFr;
  });
}

function mapRow(row: QuizQuestionRow): QuizSessionQuestion {
  return {
    id: row.id,
    templateId: row.template_id,
    difficulty: row.difficulty,
    entityType: row.entity_type,
    entityId: row.entity_id,
    fieldPath: row.field_path,
    promptFr: row.prompt_fr,
    optionsFr: row.options_fr,
    correctOption: row.correct_option,
    explanationFr: row.explanation_fr,
    assertionId: row.assertion_id,
    sourceIds: row.source_ids ?? [],
  };
}

async function getSourceGateInfoMap(
  supabase: ReturnType<typeof createServerClient>,
  sourceIds: string[]
): Promise<Map<string, SourceGateRow>> {
  if (sourceIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("sources")
    .select("id, tier, verified_at")
    .in("id", sourceIds);

  if (error) {
    logger.error("quizService.getSourceGateInfoMap failed", error);
    return new Map();
  }

  return new Map(((data ?? []) as SourceGateRow[]).map((row) => [row.id, row]));
}

/**
 * Draws `count` questions for a scope, ordered by the charter's ladder, then
 * re-validates the draw against current confidence_scores, open flags and
 * source state (AR17 batched lookups), silently dropping gate failures and
 * returning the survivors in order. No param validation here (route-layer
 * concern).
 *
 * `random` is the one scope that skips the ladder: it is the mode that exists
 * to be unstructured, and ordering it would make it a second `mixed`.
 */
// @req REQ-103
export async function composeQuizSession(
  params: ComposeQuizSessionParams
): Promise<QuizSessionQuestion[]> {
  const supabase = createServerClient();
  const { scope, count } = params;

  const subjectIds = await resolveScopedSubjects(supabase, scope);
  if (subjectIds !== null && subjectIds.length === 0) return [];

  const [candidates, countryNameFr] = await Promise.all([
    fetchCandidates(supabase, subjectIds),
    scope.kind === "country" ? getQuizScopeLabel(scope) : Promise.resolve(null),
  ]);

  const playable = shuffle(
    withoutSelfAnsweringCountryRounds(candidates, scope, countryNameFr)
  );
  if (playable.length === 0) return [];

  let ordered: CandidateRow[];
  if (scope.kind === "random") {
    ordered = playable.slice(0, count);
  } else {
    const demography = await fetchDemography(supabase, subjectIds);
    const bands = bandSubjectsByPopulation(
      [...new Set(playable.map((candidate) => candidate.entity_id))].map(
        (id) => ({
          id,
          totalPopulation: demography.get(id)?.totalPopulation ?? null,
        })
      )
    );
    ordered = composeLadder(
      playable.map((candidate) => ({
        ...candidate,
        entityId: candidate.entity_id,
      })),
      bands,
      sessionBandPlan(count)
    );
  }

  const { data, error } = await supabase
    .from("quiz_questions")
    .select(QUIZ_QUESTION_COLUMNS)
    .in(
      "id",
      ordered.map((candidate) => candidate.id)
    );

  if (error) {
    logger.error("quizService.composeQuizSession failed", error);
    return [];
  }

  // The ladder's order is the session's order, and `.in()` does not preserve it.
  const rowById = new Map(
    ((data ?? []) as QuizQuestionRow[]).map((row) => [row.id, row])
  );
  const rows = ordered
    .map((candidate) => rowById.get(candidate.id))
    .filter((row): row is QuizQuestionRow => Boolean(row));
  if (rows.length === 0) return [];

  const entityIds = Array.from(new Set(rows.map((row) => row.entity_id)));
  const sourceIds = Array.from(
    new Set(rows.flatMap((row) => row.source_ids ?? []))
  );

  const [confidenceMap, flagsMap, sourceGateMap] = await Promise.all([
    getConfidenceMap(entityIds, rows[0]?.entity_type ?? "people"),
    getFlagsSummaryMap(entityIds),
    getSourceGateInfoMap(supabase, sourceIds),
  ]);

  const survivors: QuizSessionQuestion[] = [];
  for (const row of rows) {
    const confidence = confidenceMap.get(row.entity_id);
    const flags = flagsMap.get(row.entity_id);
    const assertionSources: QuizAssertionSource[] = (row.source_ids ?? [])
      .map((sourceId) => sourceGateMap.get(sourceId))
      .filter((source): source is SourceGateRow => Boolean(source))
      .map((source) => ({
        tier: toSourceTier(source.tier),
        resolvable: source.verified_at !== null,
      }));

    const gate = isQuizEligible({
      confidenceScore: toQuizConfidenceScore(confidence?.score),
      lastHumanAuditAt: confidence?.lastHumanAuditAt ?? null,
      assertionSources,
      openFlagCount: flags?.openCount ?? 0,
    });

    if (gate.eligible) {
      survivors.push(mapRow(row));
    }
  }

  return survivors;
}

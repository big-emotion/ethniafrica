/**
 * Quiz service — segment listing + serve-time session composer.
 *
 * Story 10.6 (ETNI-495), FR65/FR66/AR17. `getQuizSegments()` aggregates
 * active question counts per (audience, difficulty) in one query.
 * `composeQuizSession()` draws a random batch for (segment, difficulty),
 * then re-validates every drawn question against *current* confidence
 * scores, open flags and source state through the shared `isQuizEligible`
 * gate (10.3) — batched, never N+1 — so a question that has decayed since
 * the last generation sweep never reaches a player even between sweeps.
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getConfidenceMap,
  getFlagsSummaryMap,
} from "@/lib/supabase/queries/afrik/module-zero-batch";
import {
  isQuizEligible,
  type QuizAssertionSource,
  type QuizSourceType,
} from "@/lib/quiz/eligibility";
import {
  DIFFICULTY_RUNGES,
  QUIZ_AUDIENCES,
  type QuizAudience,
} from "@/lib/quiz/segmentPolicy";
import type {
  QuizEntityType,
  QuizOptionValue,
  QuizTemplateId,
} from "@/types/quiz";

export interface QuizSegmentRungSummary {
  difficulty: number;
  activeQuestionCount: number;
}

export interface QuizSegmentSummary {
  audience: QuizAudience;
  rungs: QuizSegmentRungSummary[];
}

export interface ComposeQuizSessionParams {
  segment: QuizAudience;
  difficulty: number;
  count: number;
}

export interface QuizSessionQuestion {
  id: string;
  templateId: QuizTemplateId;
  audience: QuizAudience;
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
  audience: QuizAudience;
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

const QUIZ_QUESTION_COLUMNS =
  "id, template_id, audience, difficulty, entity_type, entity_id, field_path, prompt_fr, options_fr, correct_option, explanation_fr, assertion_id, source_ids";

function rungsFor(
  audience: QuizAudience,
  counts: Map<string, number>
): QuizSegmentRungSummary[] {
  const range = DIFFICULTY_RUNGES[audience];
  const rungs: QuizSegmentRungSummary[] = [];
  for (let difficulty = range.min; difficulty <= range.max; difficulty += 1) {
    rungs.push({
      difficulty,
      activeQuestionCount: counts.get(`${audience}:${difficulty}`) ?? 0,
    });
  }
  return rungs;
}

/**
 * Five segments with per-rung active question counts, in one aggregate
 * query (no N+1) — counts are grouped client-side per (audience, difficulty).
 */
// @req REQ-103
export async function getQuizSegments(): Promise<QuizSegmentSummary[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("audience, difficulty")
    .is("revoked_at", null);

  const counts = new Map<string, number>();
  if (error) {
    logger.error("quizService.getQuizSegments failed", error);
  } else {
    for (const row of (data ?? []) as Array<{
      audience: QuizAudience;
      difficulty: number;
    }>) {
      const key = `${row.audience}:${row.difficulty}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return QUIZ_AUDIENCES.map((audience) => ({
    audience,
    rungs: rungsFor(audience, counts),
  }));
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

function tierToSourceType(tier: string | null | undefined): QuizSourceType {
  if (tier === "primary") return "primary";
  if (tier === "secondary") return "secondary";
  return "ai";
}

function mapRow(row: QuizQuestionRow): QuizSessionQuestion {
  return {
    id: row.id,
    templateId: row.template_id,
    audience: row.audience,
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
 * Draws `count` random active questions for (segment, difficulty), then
 * re-validates the draw against current confidence_scores, open flags and
 * source state (AR17 batched lookups), silently dropping gate failures and
 * returning the survivors. No param validation here (route-layer concern).
 */
// @req REQ-103
export async function composeQuizSession(
  params: ComposeQuizSessionParams
): Promise<QuizSessionQuestion[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("quiz_questions")
    .select(QUIZ_QUESTION_COLUMNS)
    .eq("audience", params.segment)
    .eq("difficulty", params.difficulty)
    .is("revoked_at", null);

  if (error) {
    logger.error("quizService.composeQuizSession failed", error);
    return [];
  }

  const rows = shuffle((data ?? []) as QuizQuestionRow[]).slice(
    0,
    params.count
  );
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
        type: tierToSourceType(source.tier),
        resolvable: source.verified_at !== null,
      }));

    const gate = isQuizEligible({
      confidenceScore: confidence?.score ?? 0,
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

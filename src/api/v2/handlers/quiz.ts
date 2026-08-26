/**
 * Quiz handlers — assemble the Module #0 envelope for `/v2/quiz/segments`
 * and `/v2/quiz/session`, and hold the business logic the route layer must
 * not: French segment labels, the segment/rung semantic check (422
 * SEMANTIC_ERROR), and the source/entity-link enrichment of raw
 * `quizService.composeQuizSession` rows (Epic 10, Story 10.7, ETNI-496).
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getQuizSegments,
  composeQuizSession,
  type QuizSessionQuestion,
} from "@/api/v2/services/quizService";
import { DIFFICULTY_RUNGES, type QuizAudience } from "@/lib/quiz/segmentPolicy";
import { SOURCE_TIERS } from "@/types/sources";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type {
  QuizSessionQuery,
  QuizSegmentsData,
  QuizSessionData,
  QuizSessionQuestionView,
  QuizSourceRefView,
  QuizEntityLinkView,
} from "@/api/v2/schemas/quiz";

const AUDIENCE_LABELS_FR: Record<QuizAudience, string> = {
  children: "enfants",
  teens: "ados",
  adults: "adultes",
  university: "étudiants",
  professionals: "professionnels",
};

// @req REQ-103
export async function getQuizSegmentsHandler(): Promise<
  ApiEnvelope<QuizSegmentsData>
> {
  const segments = await getQuizSegments();

  return createApiResponse({
    segments: segments.map((segment) => ({
      id: segment.audience,
      labelFr: AUDIENCE_LABELS_FR[segment.audience],
      rungs: segment.rungs,
    })),
  });
}

interface SourceRow {
  id: string;
  title: string;
  url: string | null;
  year: number | null;
  tier: string | null;
}

/** Lower rank = higher priority. Unknown/null tiers sort last. */
const SOURCE_TIER_RANK: Record<string, number> = Object.fromEntries(
  SOURCE_TIERS.map((tier, rank) => [tier, rank])
);

async function getSourceRefsMap(
  supabase: ReturnType<typeof createServerClient>,
  sourceIds: string[]
): Promise<Map<string, SourceRow>> {
  if (sourceIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("sources")
    .select("id, title, url, year, tier")
    .in("id", sourceIds);

  if (error) {
    logger.error("quiz handler getSourceRefsMap failed", error);
    return new Map();
  }

  return new Map(((data ?? []) as SourceRow[]).map((row) => [row.id, row]));
}

const EMPTY_SOURCE_REF: QuizSourceRefView = {
  title: "",
  year: null,
  tier: null,
  url: null,
};

/**
 * Every serving question already carries ≥ 1 Tier 1/2 resolvable source
 * (FR65 gate, re-checked in `composeQuizSession`), so this only chooses
 * *which* one to surface as the answer-reveal source line — highest tier
 * first, ties broken by `sourceIds` order.
 */
function pickBestSource(
  sourceIds: string[],
  sourceMap: Map<string, SourceRow>
): QuizSourceRefView {
  const resolved = sourceIds
    .map((id) => sourceMap.get(id))
    .filter((row): row is SourceRow => Boolean(row));

  const [best] = resolved.sort(
    (a, b) =>
      (SOURCE_TIER_RANK[a.tier ?? ""] ?? 99) -
      (SOURCE_TIER_RANK[b.tier ?? ""] ?? 99)
  );

  if (!best) return EMPTY_SOURCE_REF;

  return { title: best.title, year: best.year, tier: best.tier, url: best.url };
}

interface PeopleAppellationsRow {
  id: string;
  content: {
    appellations?: { selfAppellation?: string; exonyms?: string[] };
  } | null;
}

function entityLinkFor(id: string): QuizEntityLinkView {
  return { type: "people", id, slug: id, autonym: null, exonym: null };
}

async function getEntityLinksMap(
  supabase: ReturnType<typeof createServerClient>,
  entityIds: string[]
): Promise<Map<string, QuizEntityLinkView>> {
  const map = new Map<string, QuizEntityLinkView>();
  if (entityIds.length === 0) return map;

  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("id, content")
    .in("id", entityIds);

  if (error) {
    logger.error("quiz handler getEntityLinksMap failed", error);
    return map;
  }

  for (const row of (data ?? []) as PeopleAppellationsRow[]) {
    const appellations = row.content?.appellations ?? {};
    map.set(row.id, {
      type: "people",
      id: row.id,
      slug: row.id,
      autonym: appellations.selfAppellation ?? null,
      exonym: appellations.exonyms?.[0] ?? null,
    });
  }
  return map;
}

function buildQuestionView(
  question: QuizSessionQuestion,
  sourceMap: Map<string, SourceRow>,
  entityLinkMap: Map<string, QuizEntityLinkView>
): QuizSessionQuestionView {
  return {
    id: question.id,
    templateId: question.templateId,
    promptFr: question.promptFr,
    optionsFr: question.optionsFr,
    correctOption: question.correctOption,
    explanationFr: question.explanationFr,
    source: pickBestSource(question.sourceIds, sourceMap),
    assertionId: question.assertionId,
    entity:
      entityLinkMap.get(question.entityId) ?? entityLinkFor(question.entityId),
  };
}

export type ComposeQuizSessionHandlerResult =
  | { ok: true; envelope: ApiEnvelope<QuizSessionData> }
  | { ok: false; code: "SEMANTIC_ERROR"; message: string };

/**
 * `difficulty`'s 1-5 shape is validated by the Zod schema (route layer);
 * whether that rung is actually offered by `segment` is a business rule
 * (`DIFFICULTY_RUNGES`, ETNI-493) that needs both fields together, so it is
 * checked here and mapped to 422 SEMANTIC_ERROR, never 400.
 */
// @req REQ-103
export async function composeQuizSessionHandler(
  query: QuizSessionQuery
): Promise<ComposeQuizSessionHandlerResult> {
  const range = DIFFICULTY_RUNGES[query.segment];
  if (query.difficulty < range.min || query.difficulty > range.max) {
    return {
      ok: false,
      code: "SEMANTIC_ERROR",
      message: `Difficulty ${query.difficulty} is outside the "${query.segment}" segment's range [${range.min}, ${range.max}]`,
    };
  }

  const questions = await composeQuizSession({
    segment: query.segment,
    difficulty: query.difficulty,
    count: query.count,
  });

  if (questions.length === 0) {
    return {
      ok: true,
      envelope: createApiResponse({
        segment: query.segment,
        difficulty: query.difficulty,
        questions: [],
      }),
    };
  }

  const supabase = createServerClient();
  const sourceIds = Array.from(
    new Set(questions.flatMap((question) => question.sourceIds))
  );
  const entityIds = Array.from(
    new Set(questions.map((question) => question.entityId))
  );

  const [sourceMap, entityLinkMap] = await Promise.all([
    getSourceRefsMap(supabase, sourceIds),
    getEntityLinksMap(supabase, entityIds),
  ]);

  return {
    ok: true,
    envelope: createApiResponse({
      segment: query.segment,
      difficulty: query.difficulty,
      questions: questions.map((question) =>
        buildQuestionView(question, sourceMap, entityLinkMap)
      ),
    }),
  };
}

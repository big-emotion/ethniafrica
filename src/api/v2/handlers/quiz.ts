/**
 * Quiz handlers — assemble the Module #0 envelope for `/v2/quiz/scopes` and
 * `/v2/quiz/session`, and hold the business logic the route layer must not:
 * the French label of a scope, whether a scope holds enough questions to be
 * launched (422 SEMANTIC_ERROR), and the source/entity-link enrichment of raw
 * `quizService.composeQuizSession` rows (Epic 10, Story 10.7, ETNI-496).
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getQuizScopeCatalogue,
  getQuizScopeLabel,
  composeQuizSession,
  type QuizScopeOption,
  type QuizSessionQuestion,
} from "@/api/v2/services/quizService";
import {
  parseQuizScope,
  QUIZ_SESSION_SIZE,
  type QuizScope,
} from "@/lib/quiz/quizScope";
import type { QuizThemeId } from "@/lib/quiz/segmentPolicy";
import type { QuizEntityType } from "@/types/quiz";
import { SOURCE_TIERS } from "@/types/sources";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type {
  QuizSessionQuery,
  QuizScopesData,
  QuizScopeOptionView,
  QuizScopeView,
  QuizSessionData,
  QuizSessionQuestionView,
  QuizSourceRefView,
  QuizEntityLinkView,
} from "@/api/v2/schemas/quiz";

/** The whole-corpus tracks, which have no entity and so no name in the corpus. */
const CORPUS_SCOPE_LABELS_FR = {
  mixed: "Tout le continent",
  random: "Au hasard",
} as const;

/**
 * A track is launchable when it can fill a session outright.
 *
 * Not "holds at least one question": a track offering three is a track that
 * repeats the same subject three times over eight rounds, and the picker
 * saying « 3 questions » next to a button that starts a session of eight is
 * the picker lying quietly. Khoïsan — one people, four questions — is the case
 * this threshold exists for. It is listed, counted honestly and not launchable.
 */
// @req REQ-103
export function isPlayableScope(activeQuestionCount: number): boolean {
  return activeQuestionCount >= QUIZ_SESSION_SIZE;
}

function toScopeOptionView(option: QuizScopeOption): QuizScopeOptionView {
  return {
    id: option.id,
    labelFr: option.labelFr,
    activeQuestionCount: option.activeQuestionCount,
    playable: isPlayableScope(option.activeQuestionCount),
  };
}

// @req REQ-103
export async function getQuizScopesHandler(): Promise<
  ApiEnvelope<QuizScopesData>
> {
  const catalogue = await getQuizScopeCatalogue();
  const corpusOption = (
    id: keyof typeof CORPUS_SCOPE_LABELS_FR
  ): QuizScopeOptionView => ({
    id,
    labelFr: CORPUS_SCOPE_LABELS_FR[id],
    activeQuestionCount: catalogue.totalActiveQuestionCount,
    playable: isPlayableScope(catalogue.totalActiveQuestionCount),
  });

  return createApiResponse({
    countries: catalogue.countries.map(toScopeOptionView),
    families: catalogue.families.map(toScopeOptionView),
    themes: catalogue.themes.map((theme) => ({
      id: theme.id,
      labelFr: theme.labelFr,
      activeQuestionCount: theme.activeQuestionCount,
      playable: isPlayableScope(theme.activeQuestionCount),
    })),
    mixed: corpusOption("mixed"),
    random: corpusOption("random"),
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

function entityLinkFor(
  id: string,
  type: QuizEntityType = "people"
): QuizEntityLinkView {
  return { type, id, slug: id, autonym: null, exonym: null };
}

/**
 * Names the subjects of a session, whichever kind of fiche they are.
 *
 * Two reads rather than one: a people's name lives in
 * `content.appellations.selfAppellation` and a country's in its own `name_fr`
 * column, and a country has no autonym/exonym pair at all — that opposition is
 * what a people fiche is about.
 */
async function getEntityLinksMap(
  supabase: ReturnType<typeof createServerClient>,
  peopleIds: string[],
  countryIds: string[]
): Promise<Map<string, QuizEntityLinkView>> {
  const map = new Map<string, QuizEntityLinkView>();

  if (peopleIds.length > 0) {
    const { data, error } = await supabase
      .from("afrik_peoples")
      .select("id, content")
      .in("id", peopleIds);

    if (error) {
      logger.error("quiz handler getEntityLinksMap failed", error);
    } else {
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
    }
  }

  if (countryIds.length > 0) {
    const { data, error } = await supabase
      .from("afrik_countries")
      .select("id, name_fr")
      .in("id", countryIds);

    if (error) {
      logger.error("quiz handler getEntityLinksMap failed", error);
    } else {
      for (const row of (data ?? []) as Array<{
        id: string;
        name_fr: string;
      }>) {
        map.set(row.id, {
          type: "country",
          id: row.id,
          slug: row.id,
          autonym: row.name_fr,
          exonym: null,
        });
      }
    }
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
    stimulusFr: question.stimulusFr,
    optionsFr: question.optionsFr,
    correctOption: question.correctOption,
    explanationFr: question.explanationFr,
    source: pickBestSource(question.sourceIds, sourceMap),
    assertionId: question.assertionId,
    entity:
      entityLinkMap.get(question.entityId) ??
      entityLinkFor(question.entityId, question.entityType),
  };
}

/**
 * Names a scope for the reader: the entity's own name, or the corpus track's.
 * Null means the query named a country or family the corpus does not hold —
 * well-formed but meaningless, which is a 422 and not a 400.
 */
// @req REQ-103
export async function describeScope(
  scope: QuizScope
): Promise<QuizScopeView | null> {
  if (scope.kind === "mixed" || scope.kind === "random") {
    return {
      kind: scope.kind,
      entityId: null,
      labelFr: CORPUS_SCOPE_LABELS_FR[scope.kind],
    };
  }

  const labelFr = await getQuizScopeLabel(scope);
  if (!labelFr) return null;

  return { kind: scope.kind, entityId: scope.entityId ?? null, labelFr };
}

export type ComposeQuizSessionHandlerResult =
  | { ok: true; envelope: ApiEnvelope<QuizSessionData> }
  | { ok: false; code: "SEMANTIC_ERROR"; message: string };

/**
 * The shape of `pays`/`famille` is validated by the Zod schema (route layer);
 * whether the entity it names exists and holds a session's worth of questions
 * needs the bank as well as the query, so it is checked here and mapped to 422
 * SEMANTIC_ERROR, never 400 — the same split the retired segment/rung check
 * followed.
 */
// @req REQ-103
export async function composeQuizSessionHandler(
  query: QuizSessionQuery
): Promise<ComposeQuizSessionHandlerResult> {
  const scope = parseQuizScope(query);
  const described = await describeScope(scope);

  if (!described) {
    return {
      ok: false,
      code: "SEMANTIC_ERROR",
      message: `No ${scope.kind} known as "${scope.entityId}"`,
    };
  }

  const questions = await composeQuizSession({
    scope,
    count: query.count,
    theme: query.theme as QuizThemeId | undefined,
  });

  if (questions.length === 0) {
    return {
      ok: true,
      envelope: createApiResponse({ scope: described, questions: [] }),
    };
  }

  const supabase = createServerClient();
  const sourceIds = Array.from(
    new Set(questions.flatMap((question) => question.sourceIds))
  );
  const subjectIdsByType = (entityType: QuizEntityType) =>
    Array.from(
      new Set(
        questions
          .filter((question) => question.entityType === entityType)
          .map((question) => question.entityId)
      )
    );

  const [sourceMap, entityLinkMap] = await Promise.all([
    getSourceRefsMap(supabase, sourceIds),
    getEntityLinksMap(
      supabase,
      subjectIdsByType("people"),
      subjectIdsByType("country")
    ),
  ]);

  return {
    ok: true,
    envelope: createApiResponse({
      scope: described,
      questions: questions.map((question) =>
        buildQuestionView(question, sourceMap, entityLinkMap)
      ),
    }),
  };
}

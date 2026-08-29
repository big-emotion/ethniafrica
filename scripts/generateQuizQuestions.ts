#!/usr/bin/env tsx
/**
 * Smart Quiz generation sweep + bank integrity check (Epic 10, Story 10.5,
 * ETNI-494, FR65/FR69/AR20).
 *
 * Default mode: generates one question per (fiche, template) pair that passes
 * the FR65 gate, revokes any active question that now fails the gate or the
 * QZ-2 staleness check, and writes exactly one `quiz_generation_runs` audit
 * row per sweep.
 *
 * `--check` mode: read-only. Audits the active bank against QZ-1..QZ-3 and
 * QZ-5 and exits non-zero on any violation — wired into the nightly
 * `data-integrity.yml` workflow. QZ-4 went out with the audience axis; see
 * `scripts/lib/quizGeneration.ts`.
 *
 * All decision logic lives in `scripts/lib/quizGeneration.ts` (pure, unit
 * tested with real fixtures); this file is the thin Supabase I/O shell.
 *
 * Local DRY-RUN: when Supabase env vars are missing, logs a DRY RUN notice
 * and exits 0 — same convention as `scripts/recomputeConfidence.ts`.
 */

import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "../src/lib/supabase/admin";
import { logger } from "../src/lib/api/logger";
import { getQuizMinConfidence } from "../src/lib/quiz/eligibility";
import type { AutonymExonymName } from "../src/types/quiz";
import {
  buildAssertionBindings,
  dedupeAutonyms,
  mapConfidenceRowToBaseEligibility,
  mapPeopleRowToFiche,
  type AssertionRow as AdapterAssertionRow,
  type ConfidenceScoreRow,
  type PeopleRow,
  type SourceRow as AdapterSourceRow,
} from "./lib/quizFicheAdapter";
import {
  auditActiveBank,
  computeSweepPlan,
  type ActiveQuestionRow,
  type AuditableQuestion,
  type FicheEntry,
  type QuizCandidatePools,
  type QuizQuestionRecord,
  type RevocationDecision,
} from "./lib/quizGeneration";
import {
  chunkForUrl,
  fetchAllPages,
  type PageResult,
} from "./lib/supabasePaging";

const ENTITY_TYPE = "people";

/**
 * What goes in `quiz_questions.audience`, which is `not null` and typed by the
 * `quiz_audience` enum (migration 036).
 *
 * The audience axis is retired — a session is scoped by entity now — but the
 * column outlives it: dropping it takes a migration, and 040-042 are still
 * pending, so a new one would land behind them and the sweep would be blocked
 * on a queue it does not belong to. Every row therefore carries the same value
 * and nothing reads it back. Removing the column is owed, once the pending
 * migrations land.
 */
const RETIRED_AUDIENCE_COLUMN_VALUE = "adults";

/** `quiz_questions` as the sweep and the audit read it back. */
interface QuizQuestionRow {
  id: string;
  template_id: ActiveQuestionRow["templateId"];
  entity_id: string;
  field_path: string;
  correct_option: number;
  options_fr: ActiveQuestionRow["optionsFr"];
  stimulus_fr: string | null;
  generation_run_id?: string;
}

/**
 * Reads every row matching an id filter, splitting the filter so the URL stays
 * within limits and paging each split so no tail is dropped. Both limits are
 * silent — see `scripts/lib/supabasePaging.ts` for what each one costs.
 */
async function fetchByIds<T>(
  ids: string[],
  page: (
    idChunk: string[],
    from: number,
    to: number
  ) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  if (ids.length === 0) return [];
  const pages = await Promise.all(
    chunkForUrl(ids).map((idChunk) =>
      fetchAllPages<T>((from, to) => page(idChunk, from, to))
    )
  );
  return pages.flat();
}

interface BuiltCorpus {
  entries: FicheEntry[];
  pools: QuizCandidatePools;
}

/** Loads every people fiche + its FR65-eligible assertion bindings, and the candidate pools templates draw distractors from. */
async function buildFicheEntries(
  supabase: SupabaseClient
): Promise<BuiltCorpus> {
  const peopleRows = await fetchAllPages<PeopleRow>((from, to) =>
    supabase
      .from("afrik_peoples")
      .select("id, name_main, language_family_id, content")
      .range(from, to)
  );

  const { data: familyRows, error: familyErr } = await supabase
    .from("afrik_language_families")
    .select("id, name_fr");
  if (familyErr) throw familyErr;

  const { data: countryRows, error: countryErr } = await supabase
    .from("afrik_countries")
    .select("id, name_fr");
  if (countryErr) throw countryErr;

  const familyNameById = new Map(
    (familyRows || []).map((row) => [row.id as string, row.name_fr as string])
  );
  const countryNameById = new Map(
    (countryRows || []).map((row) => [row.id as string, row.name_fr as string])
  );

  const entityIds = (peopleRows || []).map((row) => row.id as string);

  const confidenceRows = await fetchByIds<ConfidenceScoreRow>(
    entityIds,
    (idChunk, from, to) =>
      supabase
        .from("confidence_scores")
        .select("entity_id, score, last_human_audit_at, open_flag_count")
        .eq("entity_type", ENTITY_TYPE)
        .in("entity_id", idChunk)
        .range(from, to)
  );

  const assertionRows = await fetchByIds<AdapterAssertionRow>(
    entityIds,
    (idChunk, from, to) =>
      supabase
        .from("assertions")
        .select("id, entity_id, field_path, source_ids")
        .eq("entity_type", ENTITY_TYPE)
        .in("entity_id", idChunk)
        .range(from, to)
  );

  const sourceIds = [
    ...new Set(assertionRows.flatMap((row) => row.source_ids ?? [])),
  ];
  const sourceRows = await fetchByIds<AdapterSourceRow>(
    sourceIds,
    (idChunk, from, to) =>
      supabase
        .from("sources")
        .select("id, tier, verified_at")
        .in("id", idChunk)
        .range(from, to)
  );

  const confidenceByEntityId = new Map(
    (confidenceRows || []).map((row) => [
      row.entity_id as string,
      row as ConfidenceScoreRow,
    ])
  );
  const sourceById = new Map(
    (sourceRows || []).map((row) => [row.id as string, row as AdapterSourceRow])
  );
  const assertionsByEntityId = new Map<string, AdapterAssertionRow[]>();
  for (const row of (assertionRows || []) as AdapterAssertionRow[]) {
    const list = assertionsByEntityId.get(row.entity_id) ?? [];
    list.push(row);
    assertionsByEntityId.set(row.entity_id, list);
  }

  const entries: FicheEntry[] = [];
  for (const row of (peopleRows || []) as PeopleRow[]) {
    const fiche = mapPeopleRowToFiche(row, familyNameById, countryNameById);
    if (!fiche) continue;

    const baseEligibility = mapConfidenceRowToBaseEligibility(
      confidenceByEntityId.get(row.id)
    );
    const assertionsByFieldPath = buildAssertionBindings(
      assertionsByEntityId.get(row.id) ?? [],
      sourceById,
      baseEligibility
    );
    entries.push({ fiche, assertionsByFieldPath });
  }

  const pools: QuizCandidatePools = {
    familyNames: [...new Set(entries.map((e) => e.fiche.languageFamilyNameFr))],
    autonyms: [...new Set(entries.map((e) => e.fiche.selfAppellation))],
    countryNames: [
      ...new Set(
        entries.flatMap((e) =>
          e.fiche.distributionByCountry.map((c) => c.countryNameFr)
        )
      ),
    ],
    languages: dedupeAutonyms(
      entries.map((e) => e.fiche.mainLanguage as AutonymExonymName)
    ),
    isoCodes: [...new Set(entries.map((e) => e.fiche.isoCode))],
    peopleNames: dedupeAutonyms(entries.map((e) => e.fiche.subjectName)),
  };

  return { entries, pools };
}

async function fetchActiveQuestions(
  supabase: SupabaseClient
): Promise<ActiveQuestionRow[]> {
  // Paged: the bank passed 1000 rows the day the rule change let it fill, and
  // an unpaged read would have told the next sweep that 10 879 of its own
  // questions did not exist — it would have generated them again.
  const data = await fetchAllPages<QuizQuestionRow>((from, to) =>
    supabase
      .from("quiz_questions")
      .select(
        "id, template_id, entity_id, field_path, correct_option, options_fr, stimulus_fr"
      )
      .is("revoked_at", null)
      .range(from, to)
  );
  return data.map((row) => ({
    id: row.id,
    templateId: row.template_id,
    entityId: row.entity_id,
    fieldPath: row.field_path,
    correctOption: row.correct_option,
    optionsFr: row.options_fr,
    stimulusFr: row.stimulus_fr ?? null,
  }));
}

async function fetchActiveQuestionsForAudit(
  supabase: SupabaseClient
): Promise<AuditableQuestion[]> {
  // Paged for the same reason: an audit that reads 1000 of 11 879 questions
  // and reports "passed" is the failure it exists to prevent.
  const data = await fetchAllPages<QuizQuestionRow>((from, to) =>
    supabase
      .from("quiz_questions")
      .select(
        "id, template_id, entity_id, field_path, correct_option, options_fr, stimulus_fr, generation_run_id"
      )
      .is("revoked_at", null)
      .range(from, to)
  );
  return data.map((row) => ({
    id: row.id,
    templateId: row.template_id,
    entityId: row.entity_id,
    fieldPath: row.field_path,
    correctOption: row.correct_option,
    optionsFr: row.options_fr,
    stimulusFr: row.stimulus_fr ?? null,
    generationRunId: row.generation_run_id,
  }));
}

async function fetchGenerationRunIds(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const data = await fetchAllPages<{ id: string }>((from, to) =>
    supabase.from("quiz_generation_runs").select("id").range(from, to)
  );
  return new Set(data.map((row) => row.id));
}

async function insertGenerationRun(
  supabase: SupabaseClient,
  counters: {
    questionsGenerated: number;
    questionsRevoked: number;
    candidatesRejected: number;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("quiz_generation_runs")
    .insert({
      confidence_threshold: getQuizMinConfidence(),
      questions_generated: counters.questionsGenerated,
      questions_revoked: counters.questionsRevoked,
      candidates_rejected: counters.candidatesRejected,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function insertQuestions(
  supabase: SupabaseClient,
  records: QuizQuestionRecord[],
  generationRunId: string
): Promise<void> {
  if (records.length === 0) return;
  const rows = records.map((record) => ({
    template_id: record.templateId,
    audience: RETIRED_AUDIENCE_COLUMN_VALUE,
    difficulty: record.difficulty,
    entity_type: record.entityType,
    entity_id: record.entityId,
    field_path: record.fieldPath,
    prompt_fr: record.promptFr,
    stimulus_fr: record.stimulusFr,
    options_fr: record.optionsFr,
    correct_option: record.correctOption,
    explanation_fr: record.explanationFr,
    assertion_id: record.assertionId,
    source_ids: record.sourceIds,
    confidence_at_generation: record.confidenceAtGeneration,
    generation_run_id: generationRunId,
  }));
  const { error } = await supabase.from("quiz_questions").insert(rows);
  if (error) throw error;
}

async function revokeQuestions(
  supabase: SupabaseClient,
  decisions: RevocationDecision[]
): Promise<void> {
  const idsByReason = new Map<string, string[]>();
  for (const decision of decisions) {
    const ids = idsByReason.get(decision.reason) ?? [];
    ids.push(decision.id);
    idsByReason.set(decision.reason, ids);
  }
  // Chunked, because an `.in(...)` filter travels in the URL and a revocation
  // list is as long as the bank. A `--rebuild` of 11 879 questions sent ~440 KB
  // of UUIDs in one request and came back `414 Request-URI Too Large` from the
  // edge, before writing anything — the same limit `chunkForUrl` was written
  // for, in the one place that was not using it. The read paths were chunked;
  // this write path was not, so the fault only appeared on a rebuild large
  // enough to need it.
  const revokedAt = new Date().toISOString();
  for (const [reason, ids] of idsByReason) {
    for (const idChunk of chunkForUrl(ids)) {
      const { error } = await supabase
        .from("quiz_questions")
        .update({ revoked_at: revokedAt, revoked_reason: reason })
        .in("id", idChunk);
      if (error) throw error;
    }
  }
}

async function runGenerationSweep(
  supabase: SupabaseClient,
  rebuildAll: boolean
): Promise<void> {
  const { entries, pools } = await buildFicheEntries(supabase);
  const activeQuestions = await fetchActiveQuestions(supabase);

  const plan = computeSweepPlan({
    entries,
    pools,
    activeQuestions,
    rebuildAll,
  });

  if (plan.toRevoke.length > 0) {
    await revokeQuestions(supabase, plan.toRevoke);
  }

  const generationRunId = await insertGenerationRun(supabase, {
    questionsGenerated: plan.generatedCount,
    questionsRevoked: plan.revokedCount,
    candidatesRejected: plan.rejectedCount,
  });

  await insertQuestions(supabase, plan.toInsert, generationRunId);

  logger.info("Quiz generation sweep completed", {
    script: "generateQuizQuestions",
    generation_run_id: generationRunId,
    questions_generated: plan.generatedCount,
    questions_revoked: plan.revokedCount,
    candidates_rejected: plan.rejectedCount,
  });
}

async function runCheckMode(supabase: SupabaseClient): Promise<void> {
  const { entries } = await buildFicheEntries(supabase);
  const activeQuestions = await fetchActiveQuestionsForAudit(supabase);
  const knownGenerationRunIds = await fetchGenerationRunIds(supabase);

  const violations = auditActiveBank({
    activeQuestions,
    entries,
    knownGenerationRunIds,
  });

  if (violations.length > 0) {
    logger.error("Quiz bank integrity check failed", undefined, {
      script: "generateQuizQuestions",
      mode: "check",
      violation_count: violations.length,
      violations,
    });
    process.exitCode = 1;
    return;
  }

  logger.info("Quiz bank integrity check passed", {
    script: "generateQuizQuestions",
    mode: "check",
    active_question_count: activeQuestions.length,
  });
}

export async function main(): Promise<void> {
  const checkMode = process.argv.includes("--check");
  // Revokes and rebuilds the healthy part of the bank. Needed after a change
  // to how questions are built — the sweep alone is idempotent and would
  // leave every existing question exactly as it is. Never the default: it
  // rewrites the whole bank, so it is asked for, one environment at a time.
  const rebuildAll = process.argv.includes("--rebuild");

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    logger.warn(
      "DRY RUN: Supabase env vars missing — skipping quiz generation sweep",
      { script: "generateQuizQuestions", mode: checkMode ? "check" : "sweep" }
    );
    return;
  }

  const supabase = createAdminClient();

  if (checkMode) {
    await runCheckMode(supabase);
  } else {
    await runGenerationSweep(supabase, rebuildAll);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  main().catch((err) => {
    logger.error("generateQuizQuestions crashed", err, {
      script: "generateQuizQuestions",
    });
    process.exit(1);
  });
}

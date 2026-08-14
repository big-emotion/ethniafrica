/**
 * Pure generation-sweep + bank-integrity logic for the Smart Quiz engine
 * (Epic 10, Story 10.5, ETNI-494).
 *
 * `scripts/generateQuizQuestions.ts` is the thin I/O shell: it loads fiches,
 * assertions and the active bank from Supabase, delegates every decision to
 * this module, then persists the resulting plan. Keeping the decisions here
 * (no Supabase client in sight) is what makes them testable with real
 * fixtures instead of deep Supabase mocks.
 */

import type {
  AutonymExonymName,
  QuizOptionValue,
  QuizPeopleFixture,
  QuizQuestionCandidate,
  QuizTemplateId,
} from "@/types/quiz";
import {
  isQuizEligible,
  type QuizEligibilityInput,
  type QuizEligibilityRejectionReason,
} from "@/lib/quiz/eligibility";
import {
  DIFFICULTY_RUNGES,
  isAllowedForSegment,
  QUIZ_AUDIENCES,
  TEMPLATE_AVAILABILITY,
  TEMPLATE_FIELD_PATHS,
  type QuizAudience,
} from "@/lib/quiz/segmentPolicy";
import {
  isSameOptionValue,
  questionTemplateBuilders,
} from "@/lib/quiz/questionTemplates";

export interface QuizCandidatePools {
  familyNames: string[];
  autonyms: string[];
  countryNames: string[];
  languages: AutonymExonymName[];
  isoCodes: string[];
}

/** Binds a template's target field path to the assertion backing it and the FR65 gate input for that assertion. */
export interface AssertionBinding {
  assertionId: string;
  sourceIds: string[];
  eligibility: QuizEligibilityInput;
}

export interface FicheEntry {
  fiche: QuizPeopleFixture;
  /** Keyed by field path, e.g. `TEMPLATE_FIELD_PATHS.T1`. */
  assertionsByFieldPath: Record<string, AssertionBinding>;
}

export interface QuizQuestionRecord {
  templateId: QuizTemplateId;
  audience: QuizAudience;
  difficulty: number;
  entityType: "people";
  entityId: string;
  fieldPath: string;
  promptFr: string;
  optionsFr: QuizOptionValue[];
  correctOption: number;
  explanationFr: string;
  assertionId: string;
  sourceIds: string[];
  confidenceAtGeneration: number;
}

export type CandidateRejectionReason =
  | `gate_failed:${QuizEligibilityRejectionReason}`
  | "no_assertion"
  | "insufficient_distractors";

export type CandidateEvaluation =
  | {
      templateId: QuizTemplateId;
      outcome: "generated";
      record: QuizQuestionRecord;
    }
  | {
      templateId: QuizTemplateId;
      outcome: "rejected";
      reason: CandidateRejectionReason;
    };

export interface ActiveQuestionRow {
  id: string;
  templateId: QuizTemplateId;
  audience: QuizAudience;
  entityId: string;
  fieldPath: string;
  correctOption: number;
  optionsFr: QuizOptionValue[];
}

export interface AuditableQuestion extends ActiveQuestionRow {
  generationRunId: string;
}

export interface RevocationDecision {
  id: string;
  reason: string;
}

export interface SweepInput {
  entries: FicheEntry[];
  pools: QuizCandidatePools;
  activeQuestions: ActiveQuestionRow[];
  audiences?: readonly QuizAudience[];
}

export interface SweepPlan {
  toInsert: QuizQuestionRecord[];
  toRevoke: RevocationDecision[];
  generatedCount: number;
  revokedCount: number;
  rejectedCount: number;
}

export type QzCode = "QZ-1" | "QZ-2" | "QZ-3" | "QZ-4" | "QZ-5";

export interface QzViolation {
  code: QzCode;
  questionId: string;
  detail: string;
}

export interface AuditInput {
  activeQuestions: AuditableQuestion[];
  entries: FicheEntry[];
  knownGenerationRunIds: ReadonlySet<string>;
}

/** The "current fiche value" for a template's answer field — used by the QZ-2 staleness check. */
export function resolveCurrentAnswer(
  templateId: QuizTemplateId,
  fiche: QuizPeopleFixture
): QuizOptionValue | null {
  switch (templateId) {
    case "T1":
      return fiche.languageFamilyNameFr;
    case "T2":
      return fiche.selfAppellation;
    case "T3": {
      if (fiche.distributionByCountry.length === 0) return null;
      const mainCountry = fiche.distributionByCountry.reduce(
        (largest, current) =>
          current.percentage > largest.percentage ? current : largest
      );
      return mainCountry.countryNameFr;
    }
    case "T4":
      return fiche.mainLanguage;
    case "T5":
      return fiche.isoCode;
  }
}

/** Per-audience rung clamp for a template's baseline difficulty (FR68). */
export function clampDifficulty(
  baseline: number,
  audience: QuizAudience
): number {
  const range = DIFFICULTY_RUNGES[audience];
  return Math.min(Math.max(baseline, range.min), range.max);
}

function buildCandidate(
  templateId: QuizTemplateId,
  fiche: QuizPeopleFixture,
  pools: QuizCandidatePools
): QuizQuestionCandidate | null {
  switch (templateId) {
    case "T1":
      return questionTemplateBuilders.T1(fiche, pools.familyNames);
    case "T2":
      return questionTemplateBuilders.T2(fiche, pools.autonyms);
    case "T3":
      return questionTemplateBuilders.T3(fiche, pools.countryNames);
    case "T4":
      return questionTemplateBuilders.T4(fiche, pools.languages);
    case "T5":
      return questionTemplateBuilders.T5(fiche, pools.isoCodes);
  }
}

/** Evaluates a single (fiche, template, audience) triple against FR65 and the distractor pool. */
export function evaluateCandidate(
  fiche: QuizPeopleFixture,
  templateId: QuizTemplateId,
  audience: QuizAudience,
  assertion: AssertionBinding | undefined,
  pools: QuizCandidatePools
): CandidateEvaluation {
  if (!assertion) {
    return { templateId, outcome: "rejected", reason: "no_assertion" };
  }
  const gate = isQuizEligible(assertion.eligibility);
  if (!gate.eligible) {
    return {
      templateId,
      outcome: "rejected",
      reason: `gate_failed:${gate.reason}`,
    };
  }
  const candidate = buildCandidate(templateId, fiche, pools);
  if (!candidate) {
    return {
      templateId,
      outcome: "rejected",
      reason: "insufficient_distractors",
    };
  }
  return {
    templateId,
    outcome: "generated",
    record: {
      templateId: candidate.templateId,
      audience,
      difficulty: clampDifficulty(candidate.baselineDifficulty, audience),
      entityType: candidate.entityType,
      entityId: candidate.entityId,
      fieldPath: candidate.fieldPath,
      promptFr: candidate.promptFr,
      optionsFr: candidate.optionsFr,
      correctOption: candidate.correctOption,
      explanationFr: candidate.explanationFr,
      assertionId: assertion.assertionId,
      sourceIds: assertion.sourceIds,
      confidenceAtGeneration: assertion.eligibility.confidenceScore,
    },
  };
}

/** Decides whether an active question must be revoked: gate failure (incl. missing entity) or QZ-2 staleness. */
export function decideRevocation(
  question: ActiveQuestionRow,
  entry: FicheEntry | undefined
): RevocationDecision | null {
  if (!entry) {
    return { id: question.id, reason: "gate_failed:entity_missing" };
  }
  const assertion = entry.assertionsByFieldPath[question.fieldPath];
  if (!assertion) {
    return { id: question.id, reason: "gate_failed:entity_missing" };
  }
  const gate = isQuizEligible(assertion.eligibility);
  if (!gate.eligible) {
    return { id: question.id, reason: `gate_failed:${gate.reason}` };
  }
  const currentAnswer = resolveCurrentAnswer(question.templateId, entry.fiche);
  if (currentAnswer === null) {
    return { id: question.id, reason: "answer_unavailable" };
  }
  const storedAnswer = question.optionsFr[question.correctOption];
  if (!isSameOptionValue(storedAnswer, currentAnswer)) {
    return { id: question.id, reason: "stale_answer" };
  }
  return null;
}

/**
 * Computes the full sweep plan: revocations (gate failure + QZ-2 staleness)
 * and new-question generation for gate-passing, policy-available candidates
 * that don't already have an active question. Idempotent — re-running with
 * an unchanged corpus and bank yields an empty plan.
 */
export function computeSweepPlan(input: SweepInput): SweepPlan {
  const audiences = input.audiences ?? QUIZ_AUDIENCES;
  const entryById = new Map(
    input.entries.map((entry) => [entry.fiche.id, entry])
  );

  const toRevoke: RevocationDecision[] = [];
  const revokedIds = new Set<string>();
  for (const question of input.activeQuestions) {
    const decision = decideRevocation(
      question,
      entryById.get(question.entityId)
    );
    if (decision) {
      toRevoke.push(decision);
      revokedIds.add(question.id);
    }
  }

  const activeKeys = new Set(
    input.activeQuestions
      .filter((question) => !revokedIds.has(question.id))
      .map(
        (question) =>
          `${question.entityId}:${question.templateId}:${question.audience}`
      )
  );

  const toInsert: QuizQuestionRecord[] = [];
  let rejectedCount = 0;
  for (const entry of input.entries) {
    for (const audience of audiences) {
      for (const templateId of TEMPLATE_AVAILABILITY[audience]) {
        const key = `${entry.fiche.id}:${templateId}:${audience}`;
        if (activeKeys.has(key)) continue;

        const fieldPath = TEMPLATE_FIELD_PATHS[templateId];
        const assertion = entry.assertionsByFieldPath[fieldPath];
        const evaluation = evaluateCandidate(
          entry.fiche,
          templateId,
          audience,
          assertion,
          input.pools
        );
        if (evaluation.outcome === "generated") {
          toInsert.push(evaluation.record);
        } else {
          rejectedCount += 1;
        }
      }
    }
  }

  return {
    toInsert,
    toRevoke,
    generatedCount: toInsert.length,
    revokedCount: toRevoke.length,
    rejectedCount,
  };
}

/**
 * Mutation-free audit of the active bank against QZ-1..QZ-5, for `--check` mode.
 * A question can accumulate more than one violation.
 */
export function auditActiveBank(input: AuditInput): QzViolation[] {
  const entryById = new Map(
    input.entries.map((entry) => [entry.fiche.id, entry])
  );
  const violations: QzViolation[] = [];

  for (const question of input.activeQuestions) {
    const entry = entryById.get(question.entityId);
    const assertion = entry?.assertionsByFieldPath[question.fieldPath];

    // QZ-1: the assertion backing the question still resolves and passes FR65.
    if (
      !entry ||
      !assertion ||
      !isQuizEligible(assertion.eligibility).eligible
    ) {
      violations.push({
        code: "QZ-1",
        questionId: question.id,
        detail: entry
          ? "assertion no longer resolves or fails the FR65 gate"
          : "entity no longer exists",
      });
    }

    // QZ-2: correct_option matches the current fiche value (staleness).
    if (entry) {
      const currentAnswer = resolveCurrentAnswer(
        question.templateId,
        entry.fiche
      );
      const storedAnswer = question.optionsFr[question.correctOption];
      if (
        currentAnswer === null ||
        storedAnswer === undefined ||
        !isSameOptionValue(storedAnswer, currentAnswer)
      ) {
        violations.push({
          code: "QZ-2",
          questionId: question.id,
          detail: "correct_option is stale relative to the current fiche value",
        });
      }
    }

    // QZ-3: exactly 4 distinct options and a valid correct_option index.
    const distinctCount = new Set(
      question.optionsFr.map((option) =>
        typeof option === "string" ? option : option.autonym
      )
    ).size;
    if (
      question.optionsFr.length !== 4 ||
      distinctCount !== 4 ||
      question.correctOption < 0 ||
      question.correctOption > 3
    ) {
      violations.push({
        code: "QZ-3",
        questionId: question.id,
        detail:
          "options are not 4 distinct values with a valid correct_option index",
      });
    }

    // QZ-4: children segment respects the field-path allowlist.
    if (
      question.audience === "children" &&
      !isAllowedForSegment(question.fieldPath, "children")
    ) {
      violations.push({
        code: "QZ-4",
        questionId: question.id,
        detail: `field_path "${question.fieldPath}" is outside the children allowlist`,
      });
    }

    // QZ-5: generation_run_id resolves to a real quiz_generation_runs row.
    if (!input.knownGenerationRunIds.has(question.generationRunId)) {
      violations.push({
        code: "QZ-5",
        questionId: question.id,
        detail:
          "generation_run_id does not resolve to a quiz_generation_runs row",
      });
    }
  }

  return violations;
}

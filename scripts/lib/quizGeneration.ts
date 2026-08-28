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
  QUIZ_TEMPLATE_IDS,
  TEMPLATE_FIELD_PATHS,
} from "@/lib/quiz/segmentPolicy";
import {
  isSameOptionValue,
  mainCountryOf,
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
  /**
   * The template's own baseline, unclamped. It used to be squeezed into the
   * rung range of whichever audience the row belonged to; with the audience
   * axis gone there is nothing to clamp against, and a session's ladder is
   * built at serve time from the subject's population decile inside the scope
   * (games charter §4, `src/lib/quiz/quizScope.ts`).
   */
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
  /**
   * Revokes every healthy active question so the sweep rebuilds it.
   *
   * The sweep is idempotent by design: a question already in the bank is
   * skipped whatever the templates now produce. That is right for a nightly
   * run and wrong after a generator change — an improvement to how options
   * are built would otherwise never reach a single question a player sees.
   * Rebuilding is therefore possible but never implicit.
   */
  rebuildAll?: boolean;
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
      return mainCountryOf(fiche).countryNameFr;
    }
    case "T4":
      return fiche.mainLanguage;
    case "T5":
      return fiche.isoCode;
  }
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

/**
 * Nearness of a distractor candidate to the question's subject. Lower is
 * nearer, and `selectDistractors` takes the first three of whatever order it
 * receives — so this ranking, not the selector, is what makes a wrong answer
 * plausible.
 *
 * **Why the top rank is the intersection and not the family.** A question's
 * four options are frozen into `options_fr` at generation, and the same row is
 * then served inside every scope a player can pick: the whole corpus, one
 * language family, one country. Ranking on family alone satisfied the
 * pan-African pool and left a « peuples du Ghana » session answering with
 * peoples from Congo — near on the axis nobody was playing. A distractor that
 * shares *both* the subject's family and one of its countries is plausible in
 * all three scopes at once, which is the only thing one frozen option set can
 * be. So the intersection ranks first, then each axis alone, then the rest.
 *
 * For country names the ranks shift one rung inward, since a country is not a
 * people: nearest is a country the subject itself lives in — a real place for
 * that people, just not its main one, which is the hardest honest distractor
 * the corpus can offer.
 */
const SAME_FAMILY_AND_COUNTRY = 0;
const SAME_FAMILY = 1;
const SHARES_A_COUNTRY = 2;
const ELSEWHERE = 3;

/** Country-pool ranks: the subject's own countries, then its family's, then the rest. */
const SUBJECT_OWN_COUNTRY = 0;
const HOSTS_THE_FAMILY = 1;

function optionKey(value: QuizOptionValue): string {
  return typeof value === "string" ? value : value.autonym;
}

/** Sorts by rank, breaking ties on the incoming position so the result stays deterministic. */
function rankSort<T>(pool: T[], rankOf: (value: T) => number): T[] {
  return pool
    .map((value, position) => ({ value, position, rank: rankOf(value) }))
    .sort((a, b) => a.rank - b.rank || a.position - b.position)
    .map((entry) => entry.value);
}

/**
 * Reorders every distractor pool by nearness to `subject`.
 *
 * `selectDistractors` receives flattened values and cannot know a candidate's
 * genealogy or geography, so the rule cannot live there — the same finding
 * that moved the games' `pays-davant` fix to its caller. The bank's defect was
 * that one corpus-wide pool, in corpus order, was handed to every fiche: every
 * T1 question drew the same three distractors. Ordering per subject is a
 * permutation — it never adds, drops or fabricates a value, so which questions
 * generate at all is unchanged.
 */
export function orderPoolsBySubjectProximity(
  subject: QuizPeopleFixture,
  corpus: QuizPeopleFixture[],
  pools: QuizCandidatePools
): QuizCandidatePools {
  const subjectCountryIds = new Set(
    subject.distributionByCountry.map((share) => share.countryId)
  );

  const nearnessOf = (other: QuizPeopleFixture): number => {
    const sameFamily = other.languageFamilyId === subject.languageFamilyId;
    const sharesACountry = other.distributionByCountry.some((share) =>
      subjectCountryIds.has(share.countryId)
    );
    if (sameFamily && sharesACountry) return SAME_FAMILY_AND_COUNTRY;
    if (sameFamily) return SAME_FAMILY;
    return sharesACountry ? SHARES_A_COUNTRY : ELSEWHERE;
  };

  /** Maps each pool value to its nearest carrier in the corpus. */
  const nearnessByValue = (
    valueOf: (fiche: QuizPeopleFixture) => string | undefined
  ): Map<string, number> => {
    const nearness = new Map<string, number>();
    for (const other of corpus) {
      const key = valueOf(other);
      if (!key) continue;
      const candidate = nearnessOf(other);
      const known = nearness.get(key);
      if (known === undefined || candidate < known) {
        nearness.set(key, candidate);
      }
    }
    return nearness;
  };

  const byCarrier = <T extends QuizOptionValue>(
    pool: T[],
    valueOf: (fiche: QuizPeopleFixture) => string | undefined
  ): T[] => {
    const nearness = nearnessByValue(valueOf);
    return rankSort(
      pool,
      (value) => nearness.get(optionKey(value)) ?? ELSEWHERE
    );
  };

  // A country is nearest when the subject lives there, and merely nearby when
  // it hosts a people of the subject's own family.
  const countryNearness = new Map<string, number>();
  for (const other of corpus) {
    const hosting =
      other.languageFamilyId === subject.languageFamilyId
        ? HOSTS_THE_FAMILY
        : ELSEWHERE;
    for (const share of other.distributionByCountry) {
      const known = countryNearness.get(share.countryNameFr);
      if (known === undefined || hosting < known) {
        countryNearness.set(share.countryNameFr, hosting);
      }
    }
  }
  for (const share of subject.distributionByCountry) {
    countryNearness.set(share.countryNameFr, SUBJECT_OWN_COUNTRY);
  }

  return {
    familyNames: byCarrier(
      pools.familyNames,
      (fiche) => fiche.languageFamilyNameFr
    ),
    autonyms: byCarrier(pools.autonyms, (fiche) => fiche.selfAppellation),
    countryNames: rankSort(
      pools.countryNames,
      (name) => countryNearness.get(name) ?? ELSEWHERE
    ),
    languages: byCarrier(
      pools.languages,
      (fiche) => fiche.mainLanguage.autonym
    ),
    isoCodes: byCarrier(pools.isoCodes, (fiche) => fiche.isoCode),
  };
}

/** Evaluates a single (fiche, template) pair against FR65 and the distractor pool. */
export function evaluateCandidate(
  fiche: QuizPeopleFixture,
  templateId: QuizTemplateId,
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
      difficulty: candidate.baselineDifficulty,
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
      continue;
    }
    if (input.rebuildAll) {
      // Only questions that would otherwise have survived get this reason. A
      // blanket "regenerated" would erase why a question really left the
      // bank, which is the one thing a revocation record is for.
      toRevoke.push({ id: question.id, reason: "regenerated" });
      revokedIds.add(question.id);
    }
  }

  // A question is now identified by its subject and its template, and by
  // nothing else. It used to carry the audience too, which is how 2 504
  // distinct questions came to occupy 11 879 rows — the same question, asked of
  // the same fiche, stored once per audience.
  const activeKeys = new Set(
    input.activeQuestions
      .filter((question) => !revokedIds.has(question.id))
      .map((question) => `${question.entityId}:${question.templateId}`)
  );

  const corpus = input.entries.map((entry) => entry.fiche);
  const toInsert: QuizQuestionRecord[] = [];
  let rejectedCount = 0;
  for (const entry of input.entries) {
    // Ordered once per fiche, not per template: nearness is a property of the
    // subject, and all five templates ask about the same one.
    const nearestFirst = orderPoolsBySubjectProximity(
      entry.fiche,
      corpus,
      input.pools
    );
    for (const templateId of QUIZ_TEMPLATE_IDS) {
      const key = `${entry.fiche.id}:${templateId}`;
      if (activeKeys.has(key)) continue;

      const fieldPath = TEMPLATE_FIELD_PATHS[templateId];
      const assertion = entry.assertionsByFieldPath[fieldPath];
      const evaluation = evaluateCandidate(
        entry.fiche,
        templateId,
        assertion,
        nearestFirst
      );
      if (evaluation.outcome === "generated") {
        toInsert.push(evaluation.record);
      } else {
        rejectedCount += 1;
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

    // QZ-4 checked that a children-segment question stayed inside the field-path
    // allowlist. Both the segment and the allowlist are retired with the
    // audience axis, so the check has nothing left to read. The remaining codes
    // keep their numbers: renumbering them would silently change the meaning of
    // every QZ code already written down in a past audit log.

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

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
  QuizCountryFixture,
  QuizEntityType,
  QuizOptionValue,
  QuizPeopleFixture,
  QuizQuestionCandidate,
  QuizSubjectFixture,
  QuizTemplateId,
} from "@/types/quiz";
import {
  namedExonym,
  selectVerbatimFragment,
  subjectNameTokens,
} from "@/lib/quiz/proseFragment";
import {
  isQuizEligible,
  type QuizEligibilityInput,
  type QuizEligibilityRejectionReason,
} from "@/lib/quiz/eligibility";
import {
  isInversionTemplate,
  QUIZ_TEMPLATE_IDS,
  TEMPLATE_FIELD_PATHS,
  templatesFor,
} from "@/lib/quiz/segmentPolicy";
import {
  isSameOptionValue,
  mainCountryOf,
  questionTemplateBuilders,
} from "@/lib/quiz/questionTemplates";

/** A country fiche plus the assertions backing what its templates would claim. */
export interface CountryFicheEntry {
  fiche: QuizCountryFixture;
  assertionsByFieldPath: Record<string, AssertionBinding>;
}

export interface QuizCandidatePools {
  familyNames: string[];
  autonyms: string[];
  countryNames: string[];
  languages: AutonymExonymName[];
  /**
   * Every people's own name — the option space of the inversion templates,
   * whose answer is the subject rather than one of its field values.
   */
  peopleNames: AutonymExonymName[];
  /** The option space of the country inversions — every country's own name. */
  countryOwnNames: AutonymExonymName[];
  /** `content.kingdoms[].name` across the corpus, the atomic answers T16 draws on. */
  kingdomNames: string[];
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
  entityType: QuizEntityType;
  entityId: string;
  fieldPath: string;
  promptFr: string;
  /** The verbatim rubric fragment an inversion round sets its question up with. */
  stimulusFr: string | null;
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
  /** Null on every template that shows no stimulus; the quoted fragment otherwise. */
  stimulusFr: string | null;
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
  /**
   * The country corpus.
   *
   * Required, and deliberately so. It was optional — for the convenience of
   * tests written before countries had templates — and the one caller that
   * matters never filled it in, so the six country templates were live in this
   * module and absent from the bank for as long as they existed. A caller with
   * no countries says so with `[]`; it no longer says so by forgetting.
   */
  countryEntries: CountryFicheEntry[];
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
  fiche: QuizSubjectFixture
): QuizOptionValue | null {
  // `TEMPLATE_ENTITY_TYPES` already says which kind of fiche each template is
  // asked about, and the sweep only ever pairs the two correctly. TypeScript
  // cannot see that invariant through a template id, so each arm names the kind
  // its own template guarantees rather than the union widening every field.
  const people = fiche as QuizPeopleFixture;
  const country = fiche as QuizCountryFixture;

  switch (templateId) {
    case "T1":
      return people.languageFamilyNameFr;
    case "T2":
      return people.selfAppellation;
    case "T3": {
      if (people.distributionByCountry.length === 0) return null;
      return mainCountryOf(people).countryNameFr;
    }
    case "T4":
      return people.mainLanguage;
    // The inversion templates answer with the subject itself, so the stored
    // answer is the fiche's own name and cannot go stale the way a field value
    // can. What *can* go stale is the stimulus, and `decideRevocation` checks
    // that separately — QZ-2 alone would call a question healthy while it
    // quotes a paragraph the fiche no longer contains.
    case "T6":
    case "T7":
    case "T8":
    case "T9":
    case "T10":
    case "T11":
      return fiche.subjectName;
    case "T12":
      return namedExonym(people.whyProblematic, people.exonyms);
    // Country inversions, same reasoning as the people ones: the answer is the
    // subject, so it is the fiche's own name.
    case "T13":
    case "T14":
    case "T15":
    case "T17":
    case "T18":
      return fiche.subjectName;
    case "T16":
      return country.kingdomNames[0] ?? null;
  }
}

/**
 * The stimulus an inversion template would show for this fiche today, or null
 * for the templates that show none.
 *
 * Read by the staleness check: a rewritten rubric leaves the answer untouched
 * — the people is still the people — so the only way to notice the question
 * now quotes text the corpus has dropped is to recompute the fragment.
 */
// @req REQ-121
export function resolveCurrentStimulus(
  templateId: QuizTemplateId,
  fiche: QuizSubjectFixture
): string | null {
  if (!isInversionTemplate(templateId)) return null;
  return selectVerbatimFragment(
    fiche.rubrics[templateId],
    subjectNameTokens(fiche)
  );
}

function buildCandidate(
  templateId: QuizTemplateId,
  fiche: QuizSubjectFixture,
  pools: QuizCandidatePools
): QuizQuestionCandidate | null {
  // Same invariant as `resolveCurrentAnswer`: the template id decides which
  // kind of fiche this is, and the sweep only ever pairs the two correctly.
  const people = fiche as QuizPeopleFixture;
  const country = fiche as QuizCountryFixture;

  switch (templateId) {
    case "T1":
      return questionTemplateBuilders.T1(people, pools.familyNames);
    case "T2":
      return questionTemplateBuilders.T2(people, pools.autonyms);
    case "T3":
      return questionTemplateBuilders.T3(people, pools.countryNames);
    case "T4":
      return questionTemplateBuilders.T4(people, pools.languages);
    case "T6":
      return questionTemplateBuilders.T6(people, pools.peopleNames);
    case "T7":
      return questionTemplateBuilders.T7(people, pools.peopleNames);
    case "T8":
      return questionTemplateBuilders.T8(people, pools.peopleNames);
    case "T9":
      return questionTemplateBuilders.T9(people, pools.peopleNames);
    case "T10":
      return questionTemplateBuilders.T10(people, pools.peopleNames);
    case "T11":
      return questionTemplateBuilders.T11(people, pools.peopleNames);
    // Its options are the subject's own exonyms, so it needs no corpus pool.
    case "T12":
      return questionTemplateBuilders.T12(people);
    // Below: the country templates. Same invariant as `resolveCurrentAnswer` —
    // the template id is the discriminator the type system cannot read.
    case "T13":
      return questionTemplateBuilders.T13(fiche, pools.countryOwnNames);
    case "T14":
      return questionTemplateBuilders.T14(fiche, pools.countryOwnNames);
    case "T15":
      return questionTemplateBuilders.T15(fiche, pools.countryOwnNames);
    case "T16":
      return questionTemplateBuilders.T16(country, pools.kingdomNames);
    case "T17":
      return questionTemplateBuilders.T17(fiche, pools.countryOwnNames);
    case "T18":
      return questionTemplateBuilders.T18(fiche, pools.countryOwnNames);
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
    // A people's own name carries its nearness directly: the value *is* the
    // carrier, so the same ranking that makes a family plausible makes a
    // neighbouring people plausible.
    peopleNames: byCarrier(
      pools.peopleNames,
      (fiche) => fiche.subjectName.autonym
    ),
    // Passed through unchanged: nearness here is shared family and shared
    // territory, and no country has either of another country. Ordering these
    // would need a different rule wearing the same name.
    countryOwnNames: pools.countryOwnNames,
    kingdomNames: pools.kingdomNames,
  };
}

/** Evaluates a single (fiche, template) pair against FR65 and the distractor pool. */
export function evaluateCandidate(
  fiche: QuizSubjectFixture,
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
      stimulusFr: candidate.stimulusFr,
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
  entry: FicheEntry | CountryFicheEntry | undefined
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
  // An inversion round answers with its own subject, so the answer check above
  // can never fail for one — it compares a people to itself. Editing the rubric
  // it quotes would otherwise leave it serving text the corpus has dropped,
  // which is the failure a reveal is least able to survive: the fragment is
  // shown to the reader as what the corpus says.
  const currentStimulus = resolveCurrentStimulus(
    question.templateId,
    entry.fiche
  );
  if (isInversionTemplate(question.templateId) && currentStimulus === null) {
    return { id: question.id, reason: "stimulus_unavailable" };
  }
  if (currentStimulus !== null && currentStimulus !== question.stimulusFr) {
    return { id: question.id, reason: "stale_stimulus" };
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
  const countryEntries = input.countryEntries;
  // One map over both corpora. A people id is `PPL_*` and a country id is an
  // ISO 3166-1 alpha-3, so they cannot collide, and revocation needs to find a
  // question's subject without first knowing which kind it is.
  const entryById = new Map<string, FicheEntry | CountryFicheEntry>([
    ...input.entries.map(
      (entry) =>
        [entry.fiche.id, entry] as [string, FicheEntry | CountryFicheEntry]
    ),
    ...countryEntries.map(
      (entry) =>
        [entry.fiche.id, entry] as [string, FicheEntry | CountryFicheEntry]
    ),
  ]);

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

  /**
   * Runs one corpus against the templates that belong to it.
   *
   * Split by entity type rather than trying every template on every fiche: a
   * people has no `etymology` and a country has no autonym, so the shared loop
   * would reject two thirds of its candidates on a rubric that was never meant
   * to be there — a rejection count that means nothing and hides the ones that
   * do.
   */
  const sweep = (
    entries: Array<FicheEntry | CountryFicheEntry>,
    templateIds: readonly QuizTemplateId[],
    orderPools: (fiche: QuizSubjectFixture) => QuizCandidatePools
  ) => {
    for (const entry of entries) {
      const nearestFirst = orderPools(entry.fiche);
      for (const templateId of templateIds) {
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
  };

  // Ordered once per fiche, not per template: nearness is a property of the
  // subject, and every template of a corpus asks about the same one.
  sweep(input.entries, templatesFor("people"), (fiche) =>
    orderPoolsBySubjectProximity(
      fiche as QuizPeopleFixture,
      corpus,
      input.pools
    )
  );
  // No proximity ordering for countries. Nearness is defined here by shared
  // language family and shared territory, neither of which a country has of
  // another country — inventing a geographic one would be a second, unrelated
  // rule wearing the same name.
  sweep(countryEntries, templatesFor("country"), () => input.pools);

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

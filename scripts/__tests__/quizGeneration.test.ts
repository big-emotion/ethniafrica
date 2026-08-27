/**
 * Story 10.5 (ETNI-494) — generation sweep + bank-integrity audit core logic.
 * Real fixtures (QuizPeopleFixture-shaped), not deep Supabase mocks: the
 * script's DB adapter layer is a thin, separately-reviewed I/O shim, but the
 * decisions it delegates to (which candidates generate, which active
 * questions revoke, which QZ-1..QZ-5 checks fail) are pure and tested here.
 */
import { describe, expect, it } from "vitest";
import type { QuizPeopleFixture } from "@/types/quiz";
import type { QuizEligibilityInput } from "@/lib/quiz/eligibility";
import { TEMPLATE_AVAILABILITY } from "@/lib/quiz/segmentPolicy";
import {
  auditActiveBank,
  clampDifficulty,
  computeSweepPlan,
  decideRevocation,
  evaluateCandidate,
  orderPoolsBySubjectProximity,
  resolveCurrentAnswer,
  type ActiveQuestionRow,
  type AssertionBinding,
  type AuditableQuestion,
  type FicheEntry,
  type QuizCandidatePools,
} from "../lib/quizGeneration";

const yoruba: QuizPeopleFixture = {
  id: "PPL_YORUBA",
  subjectName: { autonym: "Yorùbá", exonym: "Yoruba" },
  languageFamilyId: "FLG_NIGER_CONGO",
  languageFamilyNameFr: "Niger-Congo",
  selfAppellation: "Yorùbá",
  distributionByCountry: [
    { countryId: "NGA", countryNameFr: "Nigeria", percentage: 82 },
    { countryId: "BEN", countryNameFr: "Bénin", percentage: 12 },
    { countryId: "TGO", countryNameFr: "Togo", percentage: 6 },
  ],
  mainLanguage: { autonym: "Èdè Yorùbá", exonym: "Yoruba" },
  isoCode: "yor",
};

const zulu: QuizPeopleFixture = {
  id: "PPL_ZULU",
  subjectName: { autonym: "AmaZulu", exonym: "Zoulou" },
  languageFamilyId: "FLG_NIGER_CONGO",
  languageFamilyNameFr: "Niger-Congo",
  selfAppellation: "AmaZulu",
  distributionByCountry: [
    { countryId: "ZAF", countryNameFr: "Afrique du Sud", percentage: 95 },
  ],
  mainLanguage: { autonym: "isiZulu", exonym: "Zoulou" },
  isoCode: "zul",
};

const pools: QuizCandidatePools = {
  familyNames: ["Bantou", "Nilo-Saharien", "Afro-Asiatique", "Khoisan"],
  autonyms: ["Ashanti", "Wolof", "Maasai"],
  countryNames: ["Kenya", "Ghana", "Sénégal"],
  languages: [
    { autonym: "Kiswahili" },
    { autonym: "Hausa" },
    { autonym: "Wolof" },
  ],
  isoCodes: ["swa", "hau", "wol"],
};

const eligibleInput: QuizEligibilityInput = {
  confidenceScore: 90,
  lastHumanAuditAt: "2026-01-01T00:00:00.000Z",
  assertionSources: [{ tier: "official", resolvable: true }],
  openFlagCount: 0,
};

function binding(fieldPath: string): AssertionBinding {
  return {
    assertionId: `assertion-${fieldPath}`,
    sourceIds: [`source-${fieldPath}`],
    eligibility: eligibleInput,
  };
}

function fullBindings(): Record<string, AssertionBinding> {
  return {
    languageFamilyId: binding("languageFamilyId"),
    "content.appellations.selfAppellation": binding(
      "content.appellations.selfAppellation"
    ),
    "content.demography.distributionByCountry": binding(
      "content.demography.distributionByCountry"
    ),
    "content.languages.mainLanguage": binding("content.languages.mainLanguage"),
    "content.languages.isoCodes": binding("content.languages.isoCodes"),
  };
}

describe("resolveCurrentAnswer", () => {
  // @req REQ-080
  it("resolves the T1..T5 answer fields from a people fixture", () => {
    expect(resolveCurrentAnswer("T1", yoruba)).toBe("Niger-Congo");
    expect(resolveCurrentAnswer("T2", yoruba)).toBe("Yorùbá");
    expect(resolveCurrentAnswer("T3", yoruba)).toBe("Nigeria");
    expect(resolveCurrentAnswer("T4", yoruba)).toEqual({
      autonym: "Èdè Yorùbá",
      exonym: "Yoruba",
    });
    expect(resolveCurrentAnswer("T5", yoruba)).toBe("yor");
  });

  // @req REQ-080
  it("returns null for T3 when the fiche has no country distribution", () => {
    const noCountry: QuizPeopleFixture = {
      ...yoruba,
      distributionByCountry: [],
    };
    expect(resolveCurrentAnswer("T3", noCountry)).toBeNull();
  });
});

describe("clampDifficulty", () => {
  // @req REQ-097 FR68
  it("clamps a baseline difficulty into the audience's rung range", () => {
    expect(clampDifficulty(1, "university")).toBe(3); // min 3
    expect(clampDifficulty(4, "children")).toBe(2); // max 2
    expect(clampDifficulty(2, "adults")).toBe(2); // within range unchanged
  });
});

describe("evaluateCandidate", () => {
  // @req REQ-080 REQ-103
  it("generates a record for a gate-passing, assertion-bound candidate", () => {
    const result = evaluateCandidate(
      yoruba,
      "T1",
      "adults",
      binding("languageFamilyId"),
      pools
    );
    if (result.outcome !== "generated") throw new Error("expected generated");
    expect(result.record.templateId).toBe("T1");
    expect(result.record.audience).toBe("adults");
    expect(result.record.difficulty).toBe(2); // baseline 1 clamped into [2,4]
    expect(result.record.assertionId).toBe("assertion-languageFamilyId");
    expect(result.record.confidenceAtGeneration).toBe(90);
  });

  // @req REQ-103
  it("rejects with a gate_failed reason when the assertion fails FR65", () => {
    const failing = binding("languageFamilyId");
    failing.eligibility = { ...eligibleInput, confidenceScore: 10 };
    const result = evaluateCandidate(yoruba, "T1", "adults", failing, pools);
    expect(result).toEqual({
      templateId: "T1",
      outcome: "rejected",
      reason: "gate_failed:confidence_below_threshold",
    });
  });

  // @req REQ-080
  it("rejects with no_assertion when no assertion is bound", () => {
    const result = evaluateCandidate(yoruba, "T1", "adults", undefined, pools);
    expect(result).toEqual({
      templateId: "T1",
      outcome: "rejected",
      reason: "no_assertion",
    });
  });

  // @req REQ-080
  it("rejects with insufficient_distractors when the pool can't fill 4 options", () => {
    const result = evaluateCandidate(
      yoruba,
      "T1",
      "adults",
      binding("languageFamilyId"),
      { ...pools, familyNames: ["Bantou"] }
    );
    expect(result).toEqual({
      templateId: "T1",
      outcome: "rejected",
      reason: "insufficient_distractors",
    });
  });
});

describe("decideRevocation", () => {
  const activeT1: ActiveQuestionRow = {
    id: "q-1",
    templateId: "T1",
    audience: "adults",
    entityId: "PPL_YORUBA",
    fieldPath: "languageFamilyId",
    correctOption: 0,
    optionsFr: ["Niger-Congo", "Bantou", "Nilo-Saharien", "Khoisan"],
  };

  // @req REQ-080
  it("does not revoke when the entity is still eligible and the answer is current", () => {
    const entry: FicheEntry = {
      fiche: yoruba,
      assertionsByFieldPath: fullBindings(),
    };
    expect(decideRevocation(activeT1, entry)).toBeNull();
  });

  // @req REQ-103
  it("revokes with a gate_failed reason when the assertion no longer passes FR65", () => {
    const bindings = fullBindings();
    bindings.languageFamilyId.eligibility = {
      ...eligibleInput,
      openFlagCount: 1,
    };
    const entry: FicheEntry = {
      fiche: yoruba,
      assertionsByFieldPath: bindings,
    };
    expect(decideRevocation(activeT1, entry)).toEqual({
      id: "q-1",
      reason: "gate_failed:open_flags_present",
    });
  });

  // @req REQ-080
  it("revokes with entity_missing when the fiche no longer exists", () => {
    expect(decideRevocation(activeT1, undefined)).toEqual({
      id: "q-1",
      reason: "gate_failed:entity_missing",
    });
  });

  // QZ-2: staleness
  // @req REQ-080
  it("revokes with stale_answer (QZ-2) when the fiche revision changed the answer", () => {
    const revised: QuizPeopleFixture = {
      ...yoruba,
      languageFamilyNameFr: "Nilo-Saharien",
    };
    const entry: FicheEntry = {
      fiche: revised,
      assertionsByFieldPath: fullBindings(),
    };
    expect(decideRevocation(activeT1, entry)).toEqual({
      id: "q-1",
      reason: "stale_answer",
    });
  });

  // @req REQ-080
  it("revokes with answer_unavailable when the answer field becomes empty", () => {
    const noCountryQuestion: ActiveQuestionRow = {
      ...activeT1,
      templateId: "T3",
      fieldPath: "content.demography.distributionByCountry",
      optionsFr: ["Nigeria", "Kenya", "Ghana", "Sénégal"],
    };
    const revised: QuizPeopleFixture = { ...yoruba, distributionByCountry: [] };
    const entry: FicheEntry = {
      fiche: revised,
      assertionsByFieldPath: fullBindings(),
    };
    expect(decideRevocation(noCountryQuestion, entry)).toEqual({
      id: "q-1",
      reason: "answer_unavailable",
    });
  });
});

describe("computeSweepPlan", () => {
  // @req REQ-080
  it("succeeds with zero questions for an empty eligible corpus", () => {
    const plan = computeSweepPlan({ entries: [], pools, activeQuestions: [] });
    expect(plan).toEqual({
      toInsert: [],
      toRevoke: [],
      generatedCount: 0,
      revokedCount: 0,
      rejectedCount: 0,
    });
  });

  // @req REQ-080 REQ-097
  it("generates candidates only for gate-passing, policy-available template/audience pairs", () => {
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    ];
    const plan = computeSweepPlan({ entries, pools, activeQuestions: [] });

    expect(plan.generatedCount).toBeGreaterThan(0);
    expect(plan.toInsert.every((r) => r.entityId === "PPL_YORUBA")).toBe(true);
    // T3 (demography) is outside the children allowlist -> never generated for children.
    expect(
      plan.toInsert.some(
        (r) => r.audience === "children" && r.templateId === "T3"
      )
    ).toBe(false);
    // T1 (languageFamilyId) is allowlisted for children.
    expect(
      plan.toInsert.some(
        (r) => r.audience === "children" && r.templateId === "T1"
      )
    ).toBe(true);
  });

  // @req REQ-103
  it("is idempotent: a second sweep over the same active bank generates nothing new", () => {
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    ];
    const first = computeSweepPlan({ entries, pools, activeQuestions: [] });
    const activeQuestions: ActiveQuestionRow[] = first.toInsert.map((r, i) => ({
      id: `q-${i}`,
      templateId: r.templateId,
      audience: r.audience,
      entityId: r.entityId,
      fieldPath: r.fieldPath,
      correctOption: r.correctOption,
      optionsFr: r.optionsFr,
    }));

    const second = computeSweepPlan({ entries, pools, activeQuestions });
    expect(second.generatedCount).toBe(0);
    expect(second.revokedCount).toBe(0);
  });

  /**
   * That idempotence is exactly what stops a generator improvement from ever
   * reaching a player: a question already in the bank is skipped whatever the
   * templates now produce. Rebuilding is the deliberate way through, and it
   * has to be asked for.
   */
  // @req REQ-080
  it("rebuilds a healthy bank on request, so a generator change can reach it", () => {
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    ];
    const first = computeSweepPlan({ entries, pools, activeQuestions: [] });
    const activeQuestions: ActiveQuestionRow[] = first.toInsert.map((r, i) => ({
      id: `q-${i}`,
      templateId: r.templateId,
      audience: r.audience,
      entityId: r.entityId,
      fieldPath: r.fieldPath,
      correctOption: r.correctOption,
      optionsFr: r.optionsFr,
    }));

    const rebuilt = computeSweepPlan({
      entries,
      pools,
      activeQuestions,
      rebuildAll: true,
    });

    expect(rebuilt.revokedCount).toBe(activeQuestions.length);
    expect(rebuilt.generatedCount).toBe(first.generatedCount);
    expect(
      rebuilt.toRevoke.every((decision) => decision.reason === "regenerated")
    ).toBe(true);
  });

  // @req REQ-080
  it("keeps a failing question's own revocation reason when rebuilding", () => {
    const entries: FicheEntry[] = [
      {
        fiche: yoruba,
        assertionsByFieldPath: {
          ...fullBindings(),
          languageFamilyId: {
            assertionId: "assertion-flagged",
            sourceIds: ["source-flagged"],
            eligibility: { ...eligibleInput, openFlagCount: 3 },
          },
        },
      },
    ];
    const activeQuestions: ActiveQuestionRow[] = [
      {
        id: "q-flagged",
        templateId: "T1",
        audience: "adults",
        entityId: "PPL_YORUBA",
        fieldPath: "languageFamilyId",
        correctOption: 0,
        optionsFr: ["Niger-Congo", "Bantou", "Nilo-Saharien", "Khoisan"],
      },
    ];

    const rebuilt = computeSweepPlan({
      entries,
      pools,
      activeQuestions,
      rebuildAll: true,
    });

    // A blanket "regenerated" here would erase the audit trail of *why* a
    // question left the bank, which is the one thing revocation records.
    expect(rebuilt.toRevoke[0].reason).toContain("gate_failed");
  });

  // @req REQ-080
  it("revokes a stale active question and regenerates a fresh one when the revision still passes the gate", () => {
    const activeQuestions: ActiveQuestionRow[] = [
      {
        id: "q-stale",
        templateId: "T1",
        audience: "adults",
        entityId: "PPL_YORUBA",
        fieldPath: "languageFamilyId",
        correctOption: 0,
        optionsFr: [
          "Igbo-ancienne-famille",
          "Bantou",
          "Nilo-Saharien",
          "Khoisan",
        ],
      },
    ];
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    ];
    const plan = computeSweepPlan({ entries, pools, activeQuestions });

    expect(plan.toRevoke).toEqual([{ id: "q-stale", reason: "stale_answer" }]);
    expect(
      plan.toInsert.some(
        (r) =>
          r.templateId === "T1" &&
          r.audience === "adults" &&
          r.entityId === "PPL_YORUBA"
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("counts rejected candidates without inserting them", () => {
    const failingBindings = fullBindings();
    failingBindings.languageFamilyId.eligibility = {
      ...eligibleInput,
      confidenceScore: 1,
    };
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: failingBindings },
    ];
    const plan = computeSweepPlan({
      entries,
      pools,
      activeQuestions: [],
      audiences: ["adults"],
    });
    expect(plan.toInsert.some((r) => r.templateId === "T1")).toBe(false);
    expect(plan.rejectedCount).toBeGreaterThan(0);
  });

  // @req REQ-080
  it("handles multiple fiches independently", () => {
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
      { fiche: zulu, assertionsByFieldPath: fullBindings() },
    ];
    const plan = computeSweepPlan({ entries, pools, activeQuestions: [] });
    expect(plan.toInsert.some((r) => r.entityId === "PPL_YORUBA")).toBe(true);
    expect(plan.toInsert.some((r) => r.entityId === "PPL_ZULU")).toBe(true);
  });
});

describe("auditActiveBank (QZ-1..QZ-5, --check mode)", () => {
  const runId = "run-1";

  function baseQuestion(): AuditableQuestion {
    return {
      id: "q-1",
      templateId: "T1",
      audience: "adults",
      entityId: "PPL_YORUBA",
      fieldPath: "languageFamilyId",
      correctOption: 0,
      optionsFr: ["Niger-Congo", "Bantou", "Nilo-Saharien", "Khoisan"],
      generationRunId: runId,
    };
  }

  // @req REQ-080
  it("reports no violations for a healthy active bank", () => {
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    ];
    const violations = auditActiveBank({
      activeQuestions: [baseQuestion()],
      entries,
      knownGenerationRunIds: new Set([runId]),
    });
    expect(violations).toEqual([]);
  });

  // QZ-1
  // @req REQ-103
  it("flags QZ-1 when the assertion no longer passes the FR65 gate", () => {
    const bindings = fullBindings();
    bindings.languageFamilyId.eligibility = {
      ...eligibleInput,
      openFlagCount: 2,
    };
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: bindings },
    ];
    const violations = auditActiveBank({
      activeQuestions: [baseQuestion()],
      entries,
      knownGenerationRunIds: new Set([runId]),
    });
    expect(violations.some((v) => v.code === "QZ-1")).toBe(true);
  });

  // QZ-2
  // @req REQ-080
  it("flags QZ-2 when correct_option is stale relative to the current fiche value", () => {
    const revised: QuizPeopleFixture = {
      ...yoruba,
      languageFamilyNameFr: "Khoisan",
    };
    const entries: FicheEntry[] = [
      { fiche: revised, assertionsByFieldPath: fullBindings() },
    ];
    const violations = auditActiveBank({
      activeQuestions: [baseQuestion()],
      entries,
      knownGenerationRunIds: new Set([runId]),
    });
    expect(violations.some((v) => v.code === "QZ-2")).toBe(true);
  });

  // QZ-3
  // @req REQ-080
  it("flags QZ-3 when options are not 4 distinct values", () => {
    const dupQuestion: AuditableQuestion = {
      ...baseQuestion(),
      optionsFr: ["Niger-Congo", "Niger-Congo", "Nilo-Saharien", "Khoisan"],
    };
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    ];
    const violations = auditActiveBank({
      activeQuestions: [dupQuestion],
      entries,
      knownGenerationRunIds: new Set([runId]),
    });
    expect(violations.some((v) => v.code === "QZ-3")).toBe(true);
  });

  // QZ-4
  // @req REQ-097 FR69
  it("flags QZ-4 when a children question targets a field path outside the allowlist", () => {
    const demographyQuestion: AuditableQuestion = {
      ...baseQuestion(),
      templateId: "T3",
      audience: "children",
      fieldPath: "content.demography.distributionByCountry",
      optionsFr: ["Nigeria", "Kenya", "Ghana", "Sénégal"],
    };
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    ];
    const violations = auditActiveBank({
      activeQuestions: [demographyQuestion],
      entries,
      knownGenerationRunIds: new Set([runId]),
    });
    expect(violations.some((v) => v.code === "QZ-4")).toBe(true);
  });

  // QZ-5
  // @req REQ-080
  it("flags QZ-5 when generation_run_id does not resolve to a known run", () => {
    const entries: FicheEntry[] = [
      { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    ];
    const violations = auditActiveBank({
      activeQuestions: [baseQuestion()],
      entries,
      knownGenerationRunIds: new Set(["some-other-run"]),
    });
    expect(violations.some((v) => v.code === "QZ-5")).toBe(true);
  });
});

const hausa: QuizPeopleFixture = {
  id: "PPL_HAUSA",
  subjectName: { autonym: "Hausawa", exonym: "Haoussa" },
  languageFamilyId: "FLG_AFRO_ASIATIC",
  languageFamilyNameFr: "Afro-asiatique",
  selfAppellation: "Hausawa",
  distributionByCountry: [
    { countryId: "NGA", countryNameFr: "Nigeria", percentage: 70 },
    { countryId: "NER", countryNameFr: "Niger", percentage: 30 },
  ],
  mainLanguage: { autonym: "Harshen Hausa", exonym: "Haoussa" },
  isoCode: "hau",
};

const maasai: QuizPeopleFixture = {
  id: "PPL_MAASAI",
  subjectName: { autonym: "Maa", exonym: "Maasai" },
  languageFamilyId: "FLG_NILO_SAHARAN",
  languageFamilyNameFr: "Nilo-saharien",
  selfAppellation: "Maa",
  distributionByCountry: [
    { countryId: "KEN", countryNameFr: "Kenya", percentage: 100 },
  ],
  mainLanguage: { autonym: "ɔl Maa", exonym: "Maasai" },
  isoCode: "mas",
};

/**
 * The bank's real defect was never in `selectDistractors`: it takes the first
 * three of the pool it is handed and receives flattened values, so it cannot
 * know a candidate's genealogy or geography. One corpus-wide pool, in corpus
 * order, was handed to every fiche — so every T1 question in the bank drew the
 * same three distractors. Ordering the pool per subject puts the rule where
 * the information lives, exactly as `pays-davant` does for countries.
 */
describe("orderPoolsBySubjectProximity", () => {
  // Yoruba is FLG_NIGER_CONGO, present in NGA/BEN/TGO.
  //   zulu   — same family, no shared country  -> nearest
  //   hausa  — other family, shares NGA        -> middle
  //   maasai — other family, no shared country -> farthest
  const corpus = [maasai, hausa, zulu, yoruba];

  // @req REQ-080
  it("ranks a same-family people ahead of one that merely shares a country", () => {
    const ordered = orderPoolsBySubjectProximity(yoruba, corpus, {
      ...pools,
      autonyms: ["Maa", "Hausawa", "AmaZulu"],
    });
    expect(ordered.autonyms).toEqual(["AmaZulu", "Hausawa", "Maa"]);
  });

  // @req REQ-080
  it("ranks a country the subject itself lives in ahead of one hosting a same-family people", () => {
    const ordered = orderPoolsBySubjectProximity(yoruba, corpus, {
      ...pools,
      countryNames: ["Kenya", "Afrique du Sud", "Bénin"],
    });
    expect(ordered.countryNames).toEqual(["Bénin", "Afrique du Sud", "Kenya"]);
  });

  // @req REQ-080
  it("ranks the code of a people sharing a country ahead of a stranger's", () => {
    const ordered = orderPoolsBySubjectProximity(yoruba, corpus, {
      ...pools,
      isoCodes: ["mas", "hau"],
    });
    expect(ordered.isoCodes).toEqual(["hau", "mas"]);
  });

  // @req REQ-080
  it("keeps corpus order between two candidates of equal nearness", () => {
    // Neither code belongs to anyone in the corpus, so nothing separates them.
    const ordered = orderPoolsBySubjectProximity(yoruba, corpus, {
      ...pools,
      isoCodes: ["wol", "swa"],
    });
    expect(ordered.isoCodes).toEqual(["wol", "swa"]);
  });

  // @req REQ-080
  it("permutes every pool without adding or dropping a value", () => {
    const ordered = orderPoolsBySubjectProximity(yoruba, corpus, pools);
    expect([...ordered.familyNames].sort()).toEqual(
      [...pools.familyNames].sort()
    );
    expect([...ordered.autonyms].sort()).toEqual([...pools.autonyms].sort());
    expect([...ordered.countryNames].sort()).toEqual(
      [...pools.countryNames].sort()
    );
    expect(ordered.languages).toHaveLength(pools.languages.length);
    expect([...ordered.isoCodes].sort()).toEqual([...pools.isoCodes].sort());
  });

  // @req REQ-080
  it("is deterministic across repeated calls", () => {
    const first = orderPoolsBySubjectProximity(yoruba, corpus, pools);
    const second = orderPoolsBySubjectProximity(yoruba, corpus, pools);
    expect(first).toEqual(second);
  });
});

describe("computeSweepPlan distractor proximity", () => {
  const cohabitingPools: QuizCandidatePools = {
    ...pools,
    // Neither subject's own autonym is in this pool, so corpus order alone
    // hands both of them the very same first three — the defect itself.
    // The two near candidates for the Yoruba (AmaZulu, same family; Hausawa,
    // shares Nigeria) sit deliberately *after* the first three.
    autonyms: ["Ashanti", "Wolof", "Hausawa", "AmaZulu"],
  };

  const entries: FicheEntry[] = [
    { fiche: yoruba, assertionsByFieldPath: fullBindings() },
    { fiche: zulu, assertionsByFieldPath: fullBindings() },
    { fiche: hausa, assertionsByFieldPath: fullBindings() },
    { fiche: maasai, assertionsByFieldPath: fullBindings() },
  ];

  function planForAdults() {
    return computeSweepPlan({
      entries,
      pools: cohabitingPools,
      activeQuestions: [],
      audiences: ["adults"],
    });
  }

  function distractorsOf(
    plan: ReturnType<typeof computeSweepPlan>,
    entityId: string
  ): string[] {
    const record = plan.toInsert.find(
      (candidate) =>
        candidate.templateId === "T2" && candidate.entityId === entityId
    )!;
    return record.optionsFr
      .filter((_, index) => index !== record.correctOption)
      .map((option) => (typeof option === "string" ? option : option.autonym));
  }

  // @req REQ-080
  it("no longer hands two peoples of different families the same T2 distractors", () => {
    const plan = planForAdults();
    expect(distractorsOf(plan, "PPL_YORUBA")).not.toEqual(
      distractorsOf(plan, "PPL_MAASAI")
    );
  });

  // @req REQ-080
  it("draws the Yoruba's T2 distractors nearest-first", () => {
    // AmaZulu (Niger-Congo, as the Yoruba are) then Hausawa (shares Nigeria),
    // then the first of the corpus-order remainder.
    expect(distractorsOf(planForAdults(), "PPL_YORUBA")).toEqual([
      "AmaZulu",
      "Hausawa",
      "Ashanti",
    ]);
  });

  // @req REQ-080
  it("leaves a subject with no near candidate on corpus order", () => {
    // The Maasai share neither a family nor a country with anyone else here,
    // so nothing outranks anything and the pool keeps the order it came in.
    expect(distractorsOf(planForAdults(), "PPL_MAASAI")).toEqual([
      "Ashanti",
      "Wolof",
      "Hausawa",
    ]);
  });

  // @req REQ-080
  it("generates exactly as many questions as the unordered pool did", () => {
    // Ordering permutes a pool, it never shrinks one, so the generated /
    // rejected split must stay what corpus order produced.
    const plan = planForAdults();
    expect(plan.generatedCount + plan.rejectedCount).toBe(
      entries.length * TEMPLATE_AVAILABILITY.adults.length
    );
  });
});

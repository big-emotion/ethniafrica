import { describe, expect, it } from "vitest";
import {
  buildAssertionBindings,
  dedupeAutonyms,
  mapConfidenceRowToBaseEligibility,
  mapPeopleRowToFiche,
  normalizeFieldPath,
  type AssertionRow,
  type BaseEligibility,
  type ConfidenceScoreRow,
  type PeopleRow,
  type SourceRow,
} from "../lib/quizFicheAdapter";
import { isQuizEligible } from "@/lib/quiz/eligibility";

describe("source tier feeding the FR65 gate", () => {
  const eligibility: BaseEligibility = {
    confidenceScore: 90,
    lastHumanAuditAt: "2026-01-01T00:00:00Z",
    openFlagCount: 0,
  };

  const assertion: AssertionRow[] = [
    {
      id: "AST_1",
      entity_id: "PPL_YORUBA",
      field_path: "languageFamilyId",
      source_ids: ["SRC"],
    },
  ];

  function gateVerdict(tier: string | null) {
    const sources = new Map<string, SourceRow>([
      ["SRC", { id: "SRC", tier, verified_at: "2026-01-01T00:00:00Z" }],
    ]);
    const [binding] = Object.values(
      buildAssertionBindings(assertion, sources, eligibility)
    );
    return isQuizEligible(binding.eligibility);
  }

  // @req REQ-103
  it("accepts an official source", () => {
    expect(gateVerdict("official").eligible).toBe(true);
  });

  // @req REQ-103
  it("accepts a referenced source", () => {
    expect(gateVerdict("referenced").eligible).toBe(true);
  });

  // @req REQ-103
  it("rejects an unverified source", () => {
    expect(gateVerdict("unverified")).toEqual({
      eligible: false,
      reason: "no_authoritative_source",
    });
  });

  // @req REQ-103
  it("rejects an untiered source rather than defaulting it open", () => {
    expect(gateVerdict(null)).toEqual({
      eligible: false,
      reason: "no_authoritative_source",
    });
  });
});

describe("normalizeFieldPath", () => {
  // @req REQ-103
  it("passes through exact T1/T2/T4 field paths", () => {
    expect(normalizeFieldPath("languageFamilyId")).toBe("languageFamilyId");
    expect(normalizeFieldPath("content.appellations.selfAppellation")).toBe(
      "content.appellations.selfAppellation"
    );
    expect(normalizeFieldPath("content.languages.mainLanguage")).toBe(
      "content.languages.mainLanguage"
    );
  });

  // The path is registry-driven, so retiring the template that read it turns
  // the path back into one nothing reads. Assertions already written there stay
  // in the database and stop binding to anything, which is why the sweep must
  // not run before the questions at that path are revoked.
  // @req REQ-103
  it("stops recognising the field path of a retired template", () => {
    expect(normalizeFieldPath("content.languages.isoCodes")).toBeNull();
  });

  // @req REQ-103
  it("normalizes a per-country demography field path to the T3 prefix", () => {
    expect(
      normalizeFieldPath(
        "content.demography.distributionByCountry[0].percentage"
      )
    ).toBe("content.demography.distributionByCountry");
  });

  // @req REQ-103
  it("returns null for a field path no template reads", () => {
    // A real corpus field with no template behind it. `content.culture.symbols`
    // used to stand here and became T8 — an example is only safe while it stays
    // unread.
    expect(
      normalizeFieldPath("content.organization.ageClassSystems")
    ).toBeNull();
  });
});

describe("mapPeopleRowToFiche", () => {
  const familyNameById = new Map([["FLG_BANTU", "Bantoue"]]);
  const countryNameById = new Map([["NGA", "Nigéria"]]);

  const completeRow: PeopleRow = {
    id: "PPL_YORUBA",
    name_main: "Yoruba",
    language_family_id: "FLG_BANTU",
    content: {
      appellations: {
        mainName: "Yoruba",
        selfAppellation: "Ọmọ Yorùbá",
        exonyms: ["Yoruba people"],
      },
      languages: {
        mainLanguage: "Yoruba",
        isoCodes: ["yor"],
      },
      demography: {
        distributionByCountry: [{ country: "NGA", population: 40_000_000 }],
      },
    },
  };

  // @req REQ-103
  it("maps a complete row to a QuizPeopleFixture", () => {
    const fiche = mapPeopleRowToFiche(
      completeRow,
      familyNameById,
      countryNameById
    );
    expect(fiche).toEqual({
      id: "PPL_YORUBA",
      subjectName: { autonym: "Yoruba", exonym: "Yoruba people" },
      languageFamilyId: "FLG_BANTU",
      languageFamilyNameFr: "Bantoue",
      selfAppellation: "Ọmọ Yorùbá",
      distributionByCountry: [
        { countryId: "NGA", countryNameFr: "Nigéria", population: 40_000_000 },
      ],
      mainLanguage: { autonym: "Yoruba" },
      totalPopulation: null,
      exonyms: ["Yoruba people"],
      whyProblematic: null,
      rubrics: {
        T6: null,
        T7: null,
        T8: null,
        T9: null,
        T10: null,
        T11: null,
      },
    });
  });

  /**
   * The prose rubrics sit outside the all-or-nothing guard above on purpose. A
   * fiche with no rites answers eleven templates instead of twelve; requiring
   * them would drop it from the eleven it already answers.
   */
  // @req REQ-121
  it("maps a fiche with no prose rubrics rather than rejecting it", () => {
    const fiche = mapPeopleRowToFiche(
      completeRow,
      familyNameById,
      countryNameById
    );

    expect(fiche).not.toBeNull();
    expect(fiche?.rubrics.T6).toBeNull();
    expect(fiche?.selfAppellation).toBe("Ọmọ Yorùbá");
  });

  /**
   * The all-or-nothing guard held an ISO code among its required fields, so a
   * fiche whose language carries no code was dropped from the eleven templates
   * that never asked for one. With T5 retired the field is read by nothing, and
   * rejecting on it would be rejecting on a value no round can use.
   */
  // @req REQ-103
  it("maps a fiche whose language carries no ISO code", () => {
    const fiche = mapPeopleRowToFiche(
      {
        ...completeRow,
        content: {
          ...completeRow.content,
          languages: { mainLanguage: "Yoruba" },
        },
      },
      familyNameById,
      countryNameById
    );

    expect(fiche).not.toBeNull();
    expect(fiche?.mainLanguage).toEqual({ autonym: "Yoruba" });
  });

  // @req REQ-121
  it("carries the prose rubrics an inversion round quotes", () => {
    const fiche = mapPeopleRowToFiche(
      {
        ...completeRow,
        content: {
          ...completeRow.content,
          culture: { majorRites: "Ceremonie annuelle des recoltes." },
          origins: { migrationRoutes: ["Descente vers le golfe de Guinee"] },
        },
      },
      familyNameById,
      countryNameById
    );

    expect(fiche?.rubrics.T6).toBe("Ceremonie annuelle des recoltes.");
    expect(fiche?.rubrics.T11).toEqual(["Descente vers le golfe de Guinee"]);
  });

  // @req REQ-103
  it("falls back to name_main and undefined exonym when appellations partial", () => {
    const row: PeopleRow = {
      ...completeRow,
      content: {
        ...completeRow.content,
        appellations: { selfAppellation: "Ọmọ Yorùbá" },
      },
    };
    const fiche = mapPeopleRowToFiche(row, familyNameById, countryNameById);
    expect(fiche?.subjectName).toEqual({
      autonym: "Yoruba",
      exonym: undefined,
    });
  });

  // @req REQ-103
  it("falls back to the raw country id when the country name is unknown", () => {
    const fiche = mapPeopleRowToFiche(completeRow, familyNameById, new Map());
    expect(fiche?.distributionByCountry).toEqual([
      { countryId: "NGA", countryNameFr: "NGA", population: 40_000_000 },
    ]);
  });

  // @req REQ-103
  it("returns null when selfAppellation is missing", () => {
    const row: PeopleRow = {
      ...completeRow,
      content: { ...completeRow.content, appellations: {} },
    };
    expect(
      mapPeopleRowToFiche(row, familyNameById, countryNameById)
    ).toBeNull();
  });

  // @req REQ-103
  it("returns null when mainLanguage is missing", () => {
    const row: PeopleRow = {
      ...completeRow,
      content: { ...completeRow.content, languages: { isoCodes: ["yor"] } },
    };
    expect(
      mapPeopleRowToFiche(row, familyNameById, countryNameById)
    ).toBeNull();
  });
  // @req REQ-103
  it("returns null when language_family_id is missing", () => {
    const row: PeopleRow = { ...completeRow, language_family_id: null };
    expect(
      mapPeopleRowToFiche(row, familyNameById, countryNameById)
    ).toBeNull();
  });

  // @req REQ-103
  it("returns null when the family id doesn't resolve to a known family name", () => {
    const fiche = mapPeopleRowToFiche(completeRow, new Map(), countryNameById);
    expect(fiche).toBeNull();
  });

  // @req REQ-103
  it("returns null when content is null", () => {
    const row: PeopleRow = { ...completeRow, content: null };
    expect(
      mapPeopleRowToFiche(row, familyNameById, countryNameById)
    ).toBeNull();
  });

  // @req REQ-103
  it("filters out malformed demography entries and defaults to an empty distribution", () => {
    const row: PeopleRow = {
      ...completeRow,
      content: {
        ...completeRow.content,
        demography: {
          distributionByCountry: [
            { country: "NGA" },
            { population: 10 },
            { country: "BEN", population: 5_000 },
          ],
        },
      },
    };
    const fiche = mapPeopleRowToFiche(row, familyNameById, countryNameById);
    expect(fiche?.distributionByCountry).toEqual([
      { countryId: "BEN", countryNameFr: "BEN", population: 5_000 },
    ]);
  });
});

describe("mapConfidenceRowToBaseEligibility", () => {
  // @req REQ-103
  it("converts a [0,1] score to the 0-100 scale isQuizEligible expects", () => {
    const row: ConfidenceScoreRow = {
      entity_id: "PPL_YORUBA",
      score: 0.9,
      last_human_audit_at: "2026-01-01T00:00:00Z",
      open_flag_count: 0,
    };
    expect(mapConfidenceRowToBaseEligibility(row)).toEqual({
      confidenceScore: 90,
      lastHumanAuditAt: "2026-01-01T00:00:00Z",
      openFlagCount: 0,
    });
  });

  // @req REQ-103
  it("defaults confidenceScore to 0 (gate-failing) when the row is missing", () => {
    expect(mapConfidenceRowToBaseEligibility(undefined)).toEqual({
      confidenceScore: 0,
      lastHumanAuditAt: null,
      openFlagCount: 0,
    });
  });

  // @req REQ-103
  it("defaults open_flag_count to 0 when null", () => {
    const row: ConfidenceScoreRow = {
      entity_id: "PPL_YORUBA",
      score: 0.85,
      last_human_audit_at: null,
      open_flag_count: null,
    };
    expect(mapConfidenceRowToBaseEligibility(row)).toEqual({
      confidenceScore: 85,
      lastHumanAuditAt: null,
      openFlagCount: 0,
    });
  });

  // @req REQ-103
  it("rounds fractional score*100 values", () => {
    const row: ConfidenceScoreRow = {
      entity_id: "PPL_YORUBA",
      score: 0.876,
      last_human_audit_at: null,
      open_flag_count: 1,
    };
    expect(mapConfidenceRowToBaseEligibility(row).confidenceScore).toBe(88);
  });
});

describe("buildAssertionBindings", () => {
  const baseEligibility: BaseEligibility = {
    confidenceScore: 90,
    lastHumanAuditAt: "2026-01-01T00:00:00Z",
    openFlagCount: 0,
  };

  const sourceById = new Map<string, SourceRow>([
    [
      "SRC_1",
      { id: "SRC_1", tier: "official", verified_at: "2026-01-01T00:00:00Z" },
    ],
    ["SRC_2", { id: "SRC_2", tier: "referenced", verified_at: null }],
    [
      "SRC_UNKNOWN_TIER",
      { id: "SRC_UNKNOWN_TIER", tier: null, verified_at: null },
    ],
  ]);

  // @req REQ-103
  it("builds one binding per normalized field path with mapped assertion sources", () => {
    const assertions: AssertionRow[] = [
      {
        id: "AST_1",
        entity_id: "PPL_YORUBA",
        field_path: "languageFamilyId",
        source_ids: ["SRC_1"],
      },
    ];
    const bindings = buildAssertionBindings(
      assertions,
      sourceById,
      baseEligibility
    );
    expect(bindings).toEqual({
      languageFamilyId: {
        assertionId: "AST_1",
        sourceIds: ["SRC_1"],
        eligibility: {
          ...baseEligibility,
          assertionSources: [{ tier: "official", resolvable: true }],
        },
      },
    });
  });

  // @req REQ-103
  it("keeps the first assertion per normalized field path (demography prefix collapse)", () => {
    const assertions: AssertionRow[] = [
      {
        id: "AST_COUNTRY_1",
        entity_id: "PPL_YORUBA",
        field_path: "content.demography.distributionByCountry[0].percentage",
        source_ids: ["SRC_1"],
      },
      {
        id: "AST_COUNTRY_2",
        entity_id: "PPL_YORUBA",
        field_path: "content.demography.distributionByCountry[1].percentage",
        source_ids: ["SRC_2"],
      },
    ];
    const bindings = buildAssertionBindings(
      assertions,
      sourceById,
      baseEligibility
    );
    expect(Object.keys(bindings)).toEqual([
      "content.demography.distributionByCountry",
    ]);
    expect(
      bindings["content.demography.distributionByCountry"].assertionId
    ).toBe("AST_COUNTRY_1");
  });

  // @req REQ-103
  it("skips assertions whose field path backs no template", () => {
    const assertions: AssertionRow[] = [
      {
        id: "AST_UNRELATED",
        entity_id: "PPL_YORUBA",
        field_path: "content.organization.ageClassSystems",
        source_ids: [],
      },
    ];
    expect(
      buildAssertionBindings(assertions, sourceById, baseEligibility)
    ).toEqual({});
  });

  // @req REQ-103
  it("drops source ids that don't resolve in sourceById and maps unknown tiers to ai", () => {
    const assertions: AssertionRow[] = [
      {
        id: "AST_1",
        entity_id: "PPL_YORUBA",
        field_path: "languageFamilyId",
        source_ids: ["SRC_UNKNOWN_TIER", "SRC_MISSING"],
      },
    ];
    const bindings = buildAssertionBindings(
      assertions,
      sourceById,
      baseEligibility
    );
    expect(bindings.languageFamilyId.eligibility.assertionSources).toEqual([
      { tier: "unverified", resolvable: false },
    ]);
    expect(bindings.languageFamilyId.sourceIds).toEqual([
      "SRC_UNKNOWN_TIER",
      "SRC_MISSING",
    ]);
  });

  // @req REQ-103
  it("treats a null source_ids as an empty source list", () => {
    const assertions: AssertionRow[] = [
      {
        id: "AST_1",
        entity_id: "PPL_YORUBA",
        field_path: "languageFamilyId",
        source_ids: null,
      },
    ];
    const bindings = buildAssertionBindings(
      assertions,
      sourceById,
      baseEligibility
    );
    expect(bindings.languageFamilyId.sourceIds).toEqual([]);
    expect(bindings.languageFamilyId.eligibility.assertionSources).toEqual([]);
  });

  // @req REQ-103
  it("returns an empty bindings map for an entity with no assertions", () => {
    expect(buildAssertionBindings([], sourceById, baseEligibility)).toEqual({});
  });
});

describe("dedupeAutonyms", () => {
  // @req REQ-103
  it("preserves first occurrence and drops later duplicates by autonym", () => {
    const names = [
      { autonym: "Yoruba", exonym: "Yoruba people" },
      { autonym: "Zulu" },
      { autonym: "Yoruba", exonym: "Duplicate" },
    ];
    expect(dedupeAutonyms(names)).toEqual([
      { autonym: "Yoruba", exonym: "Yoruba people" },
      { autonym: "Zulu" },
    ]);
  });

  // @req REQ-103
  it("returns an empty array for an empty input", () => {
    expect(dedupeAutonyms([])).toEqual([]);
  });
});

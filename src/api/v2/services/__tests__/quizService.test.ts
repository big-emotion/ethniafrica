/**
 * Serve-time behaviour of the quiz service.
 *
 * The fake Supabase client below answers by *table*, not by replaying a chain
 * of builder calls. The previous version of this file mocked `select().eq().is()`
 * in sequence, which meant every reordering of the query broke a test that was
 * meant to be about the FR65 gate — and which said nothing about whether the
 * right rows were being asked for. Answering by table lets a test state the
 * corpus it wants and read back the session that corpus produces.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  composeQuizSession,
  getQuizScopeCatalogue,
  getQuizScopeLabel,
} from "../quizService";

const tableRows = new Map<string, unknown[]>();
const tableErrors = new Map<string, unknown>();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fakeFrom }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const getConfidenceMapMock = vi.fn();
const getFlagsSummaryMapMock = vi.fn();

vi.mock("@/lib/supabase/queries/afrik/module-zero-batch", () => ({
  getConfidenceMap: (...args: unknown[]) => getConfidenceMapMock(...args),
  getFlagsSummaryMap: (...args: unknown[]) => getFlagsSummaryMapMock(...args),
}));

interface RowFilter {
  column: string;
  values: string[];
}

/**
 * A thenable query builder that remembers its `.eq()` / `.in()` filters and
 * applies them to the table's canned rows when awaited.
 */
function fakeFrom(table: string) {
  const filters: RowFilter[] = [];
  let single = false;

  const resolve = () => {
    const error = tableErrors.get(table) ?? null;
    if (error) return { data: null, error };

    let rows = [...(tableRows.get(table) ?? [])];
    for (const filter of filters) {
      rows = rows.filter((row) =>
        filter.values.includes(
          String((row as Record<string, unknown>)[filter.column])
        )
      );
    }
    return single
      ? { data: rows[0] ?? null, error: null }
      : { data: rows, error: null };
  };

  const query = {
    select: () => query,
    is: () => query,
    range: () => query,
    eq: (column: string, value: unknown) => {
      filters.push({ column, values: [String(value)] });
      return query;
    },
    in: (column: string, values: unknown[]) => {
      filters.push({ column, values: values.map(String) });
      return query;
    },
    maybeSingle: () => {
      single = true;
      return query;
    },
    then: (
      onfulfilled: (value: { data: unknown; error: unknown }) => unknown
    ) => Promise.resolve(resolve()).then(onfulfilled),
  };
  return query;
}

function questionRow(
  id: string,
  entityId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    template_id: "T1",
    difficulty: 1,
    entity_type: "people",
    entity_id: entityId,
    field_path: "languageFamilyId",
    prompt_fr: `Question ${id}`,
    options_fr: ["A", "B", "C", "D"],
    correct_option: 0,
    explanation_fr: "Parce que.",
    assertion_id: `assertion-${id}`,
    source_ids: ["source-1"],
    ...overrides,
  };
}

function peopleRow(id: string, familyId: string, population: number) {
  return {
    id,
    language_family_id: familyId,
    demography: { totalPopulation: population },
  };
}

const ELIGIBLE_CONFIDENCE = new Map([
  ["PPL_A", { score: 0.75, lastHumanAuditAt: null }],
  ["PPL_B", { score: 0.75, lastHumanAuditAt: null }],
  ["PPL_C", { score: 0.75, lastHumanAuditAt: null }],
]);

beforeEach(() => {
  tableRows.clear();
  tableErrors.clear();
  getConfidenceMapMock.mockReset().mockResolvedValue(ELIGIBLE_CONFIDENCE);
  getFlagsSummaryMapMock.mockReset().mockResolvedValue(new Map());

  tableRows.set("sources", [
    { id: "source-1", tier: "official", verified_at: "2026-01-01" },
  ]);
  tableRows.set("afrik_countries", [{ id: "GHA", name_fr: "Ghana" }]);
  tableRows.set("afrik_language_families", [
    { id: "FLG_NIGER_CONGO", name_fr: "Nigéro-congolaise" },
  ]);
  tableRows.set("afrik_peoples", [
    peopleRow("PPL_A", "FLG_NIGER_CONGO", 9_000_000),
    peopleRow("PPL_B", "FLG_NIGER_CONGO", 400_000),
    peopleRow("PPL_C", "FLG_NIGER_CONGO", 80_000),
  ]);
  tableRows.set("afrik_people_countries", [
    { people_id: "PPL_A", country_id: "GHA" },
    { people_id: "PPL_B", country_id: "GHA" },
  ]);
});

describe("getQuizScopeCatalogue", () => {
  // @req REQ-103
  it("counts a country's questions through the join, not the question rows alone", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q1", "PPL_A"),
      questionRow("q2", "PPL_A"),
      questionRow("q3", "PPL_B"),
      questionRow("q4", "PPL_C"),
    ]);

    const catalogue = await getQuizScopeCatalogue();

    // PPL_C holds a question but lives in no country: it counts for the family
    // and for the corpus, and for no country track.
    expect(catalogue.countries).toEqual([
      { id: "GHA", labelFr: "Ghana", activeQuestionCount: 3 },
    ]);
    expect(catalogue.families[0].activeQuestionCount).toBe(4);
    expect(catalogue.totalActiveQuestionCount).toBe(4);
  });

  // @req REQ-103
  it("lists a country holding nothing rather than hiding it", async () => {
    tableRows.set("quiz_questions", []);

    const catalogue = await getQuizScopeCatalogue();

    expect(catalogue.countries).toHaveLength(1);
    expect(catalogue.countries[0].activeQuestionCount).toBe(0);
  });

  /**
   * The theme is derived from the field path, not stored, so the catalogue can
   * count it without the bank ever being rewritten — that is what makes the
   * facet shippable without a `--rebuild`.
   */
  // @req REQ-121
  it("counts the bank by content theme as well as by track", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q1", "PPL_A"),
      questionRow("q2", "PPL_A", {
        template_id: "T7",
        field_path: "content.culture.spiritualities",
      }),
      questionRow("q3", "PPL_B", {
        template_id: "T7",
        field_path: "content.culture.spiritualities",
      }),
    ]);

    const catalogue = await getQuizScopeCatalogue();
    const byId = new Map(catalogue.themes.map((t) => [t.id, t]));

    expect(byId.get("croyances")?.activeQuestionCount).toBe(2);
    expect(byId.get("parente-linguistique")?.activeQuestionCount).toBe(1);
    expect(byId.get("migrations")?.activeQuestionCount).toBe(0);
  });

  // @req REQ-121
  it("names every theme in a fixed order, so the picker does not reshuffle as the bank grows", async () => {
    tableRows.set("quiz_questions", []);

    const catalogue = await getQuizScopeCatalogue();

    expect(catalogue.themes.map((theme) => theme.id)).toEqual([
      "noms",
      "langues",
      "parente-linguistique",
      "territoire",
      "rites-et-culture",
      "croyances",
      "royaumes-et-histoire",
      "organisation",
      "migrations",
    ]);
  });
});

describe("getQuizScopeLabel", () => {
  // @req REQ-103
  it("reads a country's name from the corpus", async () => {
    await expect(
      getQuizScopeLabel({ kind: "country", entityId: "GHA" })
    ).resolves.toBe("Ghana");
  });

  // @req REQ-103
  it("returns null for an id the corpus does not hold", async () => {
    await expect(
      getQuizScopeLabel({ kind: "country", entityId: "ZZZ" })
    ).resolves.toBeNull();
  });
});

describe("composeQuizSession", () => {
  // @req REQ-103
  it("draws only from the peoples of the scoped country", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q-a", "PPL_A"),
      questionRow("q-b", "PPL_B"),
      questionRow("q-c", "PPL_C"),
    ]);

    const session = await composeQuizSession({
      scope: { kind: "country", entityId: "GHA" },
      count: 8,
    });

    expect(session.map((q) => q.entityId).sort()).toEqual(["PPL_A", "PPL_B"]);
  });

  // @req REQ-103
  it("opens on the most populous subject of the scope and ends on the least", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q-c", "PPL_C"),
      questionRow("q-a", "PPL_A"),
      questionRow("q-b", "PPL_B"),
    ]);

    const session = await composeQuizSession({
      scope: { kind: "family", entityId: "FLG_NIGER_CONGO" },
      count: 3,
    });

    expect(session[0].entityId).toBe("PPL_A");
    expect(session[session.length - 1].entityId).toBe("PPL_C");
  });

  // @req REQ-103
  it("drops a T3 round whose answer is the country the session is named after", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q-giveaway", "PPL_A", {
        template_id: "T3",
        field_path: "content.demography.distributionByCountry",
        options_fr: ["Ghana", "Togo", "Bénin", "Nigeria"],
        correct_option: 0,
      }),
      questionRow("q-elsewhere", "PPL_B", {
        template_id: "T3",
        field_path: "content.demography.distributionByCountry",
        options_fr: ["Ghana", "Togo", "Bénin", "Nigeria"],
        correct_option: 1,
      }),
    ]);

    const session = await composeQuizSession({
      scope: { kind: "country", entityId: "GHA" },
      count: 8,
    });

    expect(session.map((q) => q.id)).toEqual(["q-elsewhere"]);
  });

  // @req REQ-103
  it("keeps that same T3 round when the session is not named after its answer", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q-giveaway", "PPL_A", {
        template_id: "T3",
        field_path: "content.demography.distributionByCountry",
        options_fr: ["Ghana", "Togo", "Bénin", "Nigeria"],
        correct_option: 0,
      }),
    ]);

    const session = await composeQuizSession({
      scope: { kind: "mixed" },
      count: 8,
    });

    expect(session.map((q) => q.id)).toEqual(["q-giveaway"]);
  });

  // @req REQ-103
  it("re-validates the draw against current confidence, dropping failures", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q-a", "PPL_A"),
      questionRow("q-b", "PPL_B"),
    ]);
    getConfidenceMapMock.mockResolvedValue(
      new Map([
        ["PPL_A", { score: 0.75, lastHumanAuditAt: null }],
        ["PPL_B", { score: 0.1, lastHumanAuditAt: null }],
      ])
    );

    const session = await composeQuizSession({
      scope: { kind: "mixed" },
      count: 8,
    });

    expect(session.map((q) => q.entityId)).toEqual(["PPL_A"]);
  });

  // @req REQ-103
  it("drops a question whose entity has an open flag", async () => {
    tableRows.set("quiz_questions", [questionRow("q-a", "PPL_A")]);
    getFlagsSummaryMapMock.mockResolvedValue(
      new Map([["PPL_A", { openCount: 1 }]])
    );

    const session = await composeQuizSession({
      scope: { kind: "mixed" },
      count: 8,
    });

    expect(session).toEqual([]);
  });

  // @req REQ-103
  it("draws at most `count` questions from a larger pool", async () => {
    tableRows.set(
      "quiz_questions",
      ["q1", "q2", "q3", "q4", "q5"].map((id) => questionRow(id, "PPL_A"))
    );

    const session = await composeQuizSession({
      scope: { kind: "mixed" },
      count: 3,
    });

    expect(session).toHaveLength(3);
  });

  // @req REQ-103
  it("returns an empty array without consulting the batched lookups when the scope is empty", async () => {
    tableRows.set("quiz_questions", []);

    const session = await composeQuizSession({
      scope: { kind: "country", entityId: "ZZZ" },
      count: 8,
    });

    expect(session).toEqual([]);
    expect(getConfidenceMapMock).not.toHaveBeenCalled();
  });

  /**
   * The facet the picker was missing. It composes with the track rather than
   * replacing it: a country and a theme narrow the same pool, in that order.
   */
  // @req REQ-121
  it("narrows the draw to one content theme, keeping the track", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q-family", "PPL_A"),
      questionRow("q-belief", "PPL_A", {
        template_id: "T7",
        field_path: "content.culture.spiritualities",
      }),
      questionRow("q-rites", "PPL_B", {
        template_id: "T6",
        field_path: "content.culture.majorRites",
      }),
    ]);

    const session = await composeQuizSession({
      scope: { kind: "country", entityId: "GHA" },
      count: 8,
      theme: "croyances",
    });

    expect(session.map((question) => question.id)).toEqual(["q-belief"]);
  });

  // @req REQ-121
  it("serves the whole track when no theme is asked for", async () => {
    tableRows.set("quiz_questions", [
      questionRow("q-family", "PPL_A"),
      questionRow("q-belief", "PPL_A", {
        template_id: "T7",
        field_path: "content.culture.spiritualities",
      }),
    ]);

    const session = await composeQuizSession({
      scope: { kind: "country", entityId: "GHA" },
      count: 8,
    });

    expect(session).toHaveLength(2);
  });

  // @req REQ-103
  it("returns an empty array without throwing on a query error", async () => {
    tableErrors.set("quiz_questions", { message: "boom" });

    const session = await composeQuizSession({
      scope: { kind: "mixed" },
      count: 8,
    });

    expect(session).toEqual([]);
  });
});

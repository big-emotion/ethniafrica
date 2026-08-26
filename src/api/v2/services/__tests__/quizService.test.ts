import { describe, it, expect, vi, beforeEach } from "vitest";
import { getQuizSegments, composeQuizSession } from "../quizService";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const getConfidenceMapMock = vi.fn();
const getFlagsSummaryMapMock = vi.fn();

vi.mock("@/lib/supabase/queries/afrik/module-zero-batch", () => ({
  getConfidenceMap: (...args: unknown[]) => getConfidenceMapMock(...args),
  getFlagsSummaryMap: (...args: unknown[]) => getFlagsSummaryMapMock(...args),
}));

interface FakeResult {
  data: unknown;
  error: unknown;
}

function buildAggregateQuery(result: FakeResult) {
  const query = {
    select: vi.fn(() => query),
    is: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

function buildSessionQuery(result: FakeResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

function buildSourcesQuery(result: FakeResult) {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

function questionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "q-1",
    template_id: "T1",
    audience: "adults",
    difficulty: 3,
    entity_type: "people",
    entity_id: "PPL_A",
    field_path: "languageFamilyId",
    prompt_fr: "Quelle famille linguistique ?",
    options_fr: ["Bantu", "Nilotic", "Chadic", "Cushitic"],
    correct_option: 0,
    explanation_fr: "Explication",
    assertion_id: "assertion-1",
    source_ids: ["source-1"],
    ...overrides,
  };
}

beforeEach(() => {
  fromMock.mockReset();
  getConfidenceMapMock.mockReset();
  getFlagsSummaryMapMock.mockReset();
  getConfidenceMapMock.mockResolvedValue(new Map());
  getFlagsSummaryMapMock.mockResolvedValue(new Map());
});

describe("getQuizSegments", () => {
  // @req REQ-103
  it("returns the five segments with per-rung active question counts from one aggregate query", async () => {
    const query = buildAggregateQuery({
      data: [
        { audience: "children", difficulty: 1 },
        { audience: "children", difficulty: 1 },
        { audience: "children", difficulty: 2 },
        { audience: "adults", difficulty: 3 },
      ],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const segments = await getQuizSegments();

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("quiz_questions");
    expect(query.select).toHaveBeenCalledTimes(1);
    expect(query.is).toHaveBeenCalledWith("revoked_at", null);

    expect(segments).toHaveLength(5);
    expect(segments.map((segment) => segment.audience)).toEqual([
      "children",
      "teens",
      "adults",
      "university",
      "professionals",
    ]);

    const children = segments.find(
      (segment) => segment.audience === "children"
    );
    expect(children?.rungs).toEqual([
      { difficulty: 1, activeQuestionCount: 2 },
      { difficulty: 2, activeQuestionCount: 1 },
    ]);

    const adults = segments.find((segment) => segment.audience === "adults");
    expect(adults?.rungs).toEqual([
      { difficulty: 2, activeQuestionCount: 0 },
      { difficulty: 3, activeQuestionCount: 1 },
      { difficulty: 4, activeQuestionCount: 0 },
    ]);
  });

  // @req REQ-103
  it("returns all segments with zero counts on a query error, without throwing", async () => {
    const query = buildAggregateQuery({
      data: null,
      error: { message: "boom" },
    });
    fromMock.mockReturnValue(query);

    const segments = await getQuizSegments();

    expect(segments).toHaveLength(5);
    for (const segment of segments) {
      for (const rung of segment.rungs) {
        expect(rung.activeQuestionCount).toBe(0);
      }
    }
  });
});

describe("composeQuizSession", () => {
  // @req REQ-103
  it("re-validates the draw against current confidence, flags and sources, dropping failures", async () => {
    const rows = [
      questionRow({
        id: "q-eligible",
        entity_id: "PPL_OK",
        source_ids: ["s-ok"],
      }),
      questionRow({
        id: "q-low-confidence",
        entity_id: "PPL_LOW",
        source_ids: ["s-ok"],
      }),
      questionRow({
        id: "q-open-flag",
        entity_id: "PPL_FLAGGED",
        source_ids: ["s-ok"],
      }),
    ];
    const sessionQuery = buildSessionQuery({ data: rows, error: null });
    const sourcesQuery = buildSourcesQuery({
      data: [
        { id: "s-ok", tier: "official", verified_at: "2026-01-01T00:00:00Z" },
      ],
      error: null,
    });
    fromMock.mockImplementation((table: string) =>
      table === "sources" ? sourcesQuery : sessionQuery
    );

    getConfidenceMapMock.mockResolvedValue(
      new Map([
        [
          "PPL_OK",
          {
            entityId: "PPL_OK",
            score: 90,
            lastHumanAuditAt: "2026-01-01T00:00:00Z",
            openFlagCount: 0,
          },
        ],
        [
          "PPL_LOW",
          {
            entityId: "PPL_LOW",
            score: 10,
            lastHumanAuditAt: "2026-01-01T00:00:00Z",
            openFlagCount: 0,
          },
        ],
        [
          "PPL_FLAGGED",
          {
            entityId: "PPL_FLAGGED",
            score: 90,
            lastHumanAuditAt: "2026-01-01T00:00:00Z",
            openFlagCount: 0,
          },
        ],
      ])
    );
    getFlagsSummaryMapMock.mockResolvedValue(
      new Map([["PPL_FLAGGED", { openCount: 1, totalCount: 1 }]])
    );

    const questions = await composeQuizSession({
      segment: "adults",
      difficulty: 3,
      count: 3,
    });

    expect(sessionQuery.eq).toHaveBeenCalledWith("audience", "adults");
    expect(sessionQuery.eq).toHaveBeenCalledWith("difficulty", 3);
    expect(sessionQuery.is).toHaveBeenCalledWith("revoked_at", null);
    expect(getConfidenceMapMock).toHaveBeenCalledWith(
      expect.arrayContaining(["PPL_OK", "PPL_LOW", "PPL_FLAGGED"]),
      "people"
    );
    expect(getFlagsSummaryMapMock).toHaveBeenCalledWith(
      expect.arrayContaining(["PPL_OK", "PPL_LOW", "PPL_FLAGGED"])
    );

    expect(questions).toHaveLength(1);
    expect(questions[0].id).toBe("q-eligible");
  });

  // @req REQ-103
  it("returns the shorter array without error when the whole draw fails the gate", async () => {
    const rows = [questionRow({ id: "q-1", entity_id: "PPL_A" })];
    fromMock.mockImplementation((table: string) =>
      table === "sources"
        ? buildSourcesQuery({ data: [], error: null })
        : buildSessionQuery({ data: rows, error: null })
    );
    getConfidenceMapMock.mockResolvedValue(new Map());
    getFlagsSummaryMapMock.mockResolvedValue(new Map());

    const questions = await composeQuizSession({
      segment: "adults",
      difficulty: 3,
      count: 5,
    });

    expect(questions).toEqual([]);
  });

  // @req REQ-103
  it("draws at most `count` questions from a larger eligible pool", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      questionRow({ id: `q-${i}`, entity_id: `PPL_${i}`, source_ids: ["s-ok"] })
    );
    fromMock.mockImplementation((table: string) =>
      table === "sources"
        ? buildSourcesQuery({
            data: [
              {
                id: "s-ok",
                tier: "official",
                verified_at: "2026-01-01T00:00:00Z",
              },
            ],
            error: null,
          })
        : buildSessionQuery({ data: rows, error: null })
    );
    getConfidenceMapMock.mockResolvedValue(
      new Map(
        rows.map((row) => [
          row.entity_id,
          {
            entityId: row.entity_id,
            score: 90,
            lastHumanAuditAt: "2026-01-01T00:00:00Z",
            openFlagCount: 0,
          },
        ])
      )
    );
    getFlagsSummaryMapMock.mockResolvedValue(new Map());

    const questions = await composeQuizSession({
      segment: "adults",
      difficulty: 3,
      count: 2,
    });

    expect(questions).toHaveLength(2);
    const ids = new Set(rows.map((row) => row.id));
    for (const question of questions) {
      expect(ids.has(question.id)).toBe(true);
    }
  });

  // @req REQ-103
  it("returns an empty array without querying batched lookups when no active questions match", async () => {
    fromMock.mockImplementation((table: string) =>
      table === "sources"
        ? buildSourcesQuery({ data: [], error: null })
        : buildSessionQuery({ data: [], error: null })
    );

    const questions = await composeQuizSession({
      segment: "children",
      difficulty: 1,
      count: 5,
    });

    expect(questions).toEqual([]);
    expect(getConfidenceMapMock).not.toHaveBeenCalled();
    expect(getFlagsSummaryMapMock).not.toHaveBeenCalled();
  });

  // @req REQ-103
  it("returns an empty array without throwing on a query error", async () => {
    fromMock.mockImplementation((table: string) =>
      table === "sources"
        ? buildSourcesQuery({ data: [], error: null })
        : buildSessionQuery({ data: null, error: { message: "boom" } })
    );

    const questions = await composeQuizSession({
      segment: "adults",
      difficulty: 3,
      count: 5,
    });

    expect(questions).toEqual([]);
  });
});

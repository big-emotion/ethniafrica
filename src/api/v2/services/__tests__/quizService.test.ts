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

interface FakeCountResult {
  count: number | null;
  error: unknown;
}

/**
 * `getQuizSegments` asks for one count per rung, so the fake resolves from a
 * `audience:difficulty` lookup rather than a single canned result.
 */
function buildRungCountQuery(
  countsByRung: Record<string, number>,
  error: unknown = null
) {
  const asked: string[] = [];
  let audience = "";
  let difficulty = 0;
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string | number) => {
      if (column === "audience") audience = value as string;
      if (column === "difficulty") difficulty = value as number;
      return query;
    }),
    is: vi.fn(() => {
      const rung = `${audience}:${difficulty}`;
      asked.push(rung);
      return Promise.resolve({
        count: error ? null : (countsByRung[rung] ?? 0),
        error,
      } as FakeCountResult);
    }),
    asked,
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
  it("counts each rung server-side, so a bank larger than one PostgREST page is reported in full", async () => {
    // 11 879 questions live in the bank; a row-reading select caps at 1000 and
    // says nothing, which reported four of the five segments as empty.
    const query = buildRungCountQuery({
      "children:1": 621,
      "children:2": 1242,
      "adults:2": 1883,
      "adults:4": 621,
    });
    fromMock.mockReturnValue(query);

    const segments = await getQuizSegments();

    expect(fromMock).toHaveBeenCalledWith("quiz_questions");
    expect(query.select).toHaveBeenCalledWith(
      "id",
      expect.objectContaining({ count: "exact", head: true })
    );
    expect(query.is).toHaveBeenCalledWith("revoked_at", null);

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
      { difficulty: 1, activeQuestionCount: 621 },
      { difficulty: 2, activeQuestionCount: 1242 },
    ]);

    const adults = segments.find((segment) => segment.audience === "adults");
    expect(adults?.rungs).toEqual([
      { difficulty: 2, activeQuestionCount: 1883 },
      { difficulty: 3, activeQuestionCount: 0 },
      { difficulty: 4, activeQuestionCount: 621 },
    ]);
  });

  // @req REQ-103
  it("asks for exactly the rungs each segment's ladder offers", async () => {
    const query = buildRungCountQuery({});
    fromMock.mockReturnValue(query);

    await getQuizSegments();

    expect(query.asked).toEqual([
      "children:1",
      "children:2",
      "teens:1",
      "teens:2",
      "teens:3",
      "adults:2",
      "adults:3",
      "adults:4",
      "university:3",
      "university:4",
      "university:5",
      "professionals:3",
      "professionals:4",
      "professionals:5",
    ]);
  });

  // @req REQ-103
  it("returns all segments with zero counts on a query error, without throwing", async () => {
    const query = buildRungCountQuery({}, { message: "boom" });
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
            score: 0.9,
            lastHumanAuditAt: "2026-01-01T00:00:00Z",
            openFlagCount: 0,
          },
        ],
        [
          "PPL_LOW",
          {
            entityId: "PPL_LOW",
            score: 0.1,
            lastHumanAuditAt: "2026-01-01T00:00:00Z",
            openFlagCount: 0,
          },
        ],
        [
          "PPL_FLAGGED",
          {
            entityId: "PPL_FLAGGED",
            score: 0.9,
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
  it("keeps a question whose entity carries a corpus-typical decimal score", async () => {
    // `confidence_scores.score` is a [0,1] decimal (corpus median 0.68) while
    // the gate's threshold is 60 on a 0-100 scale. Comparing the two raw
    // rejected every question in the bank and served an empty session.
    const rows = [
      questionRow({
        id: "q-typical",
        entity_id: "PPL_OK",
        source_ids: ["s-ok"],
      }),
    ];
    fromMock.mockImplementation((table: string) =>
      table === "sources"
        ? buildSourcesQuery({
            data: [{ id: "s-ok", tier: "referenced", verified_at: null }],
            error: null,
          })
        : buildSessionQuery({ data: rows, error: null })
    );
    getConfidenceMapMock.mockResolvedValue(
      new Map([
        [
          "PPL_OK",
          {
            entityId: "PPL_OK",
            score: 0.68,
            lastHumanAuditAt: null,
            openFlagCount: 0,
          },
        ],
      ])
    );
    getFlagsSummaryMapMock.mockResolvedValue(new Map());

    const questions = await composeQuizSession({
      segment: "children",
      difficulty: 1,
      count: 8,
    });

    expect(questions.map((question) => question.id)).toEqual(["q-typical"]);
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
            score: 0.9,
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

import { describe, it, expect, vi, beforeEach } from "vitest";

const getQuizSegmentsMock = vi.fn();
const composeQuizSessionMock = vi.fn();

vi.mock("@/api/v2/services/quizService", () => ({
  getQuizSegments: (...args: unknown[]) => getQuizSegmentsMock(...args),
  composeQuizSession: (...args: unknown[]) => composeQuizSessionMock(...args),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

function buildInQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

import { getQuizSegmentsHandler, composeQuizSessionHandler } from "../quiz";

beforeEach(() => {
  getQuizSegmentsMock.mockReset();
  composeQuizSessionMock.mockReset();
  fromMock.mockReset();
});

describe("getQuizSegmentsHandler", () => {
  // @req REQ-103
  it("maps service segments to the API view with French labels", async () => {
    getQuizSegmentsMock.mockResolvedValue([
      {
        audience: "children",
        rungs: [{ difficulty: 1, activeQuestionCount: 42 }],
      },
      { audience: "adults", rungs: [] },
    ]);

    const envelope = await getQuizSegmentsHandler();

    expect(envelope.meta.license).toBe("CC-BY-SA-4.0");
    expect(envelope.errors).toEqual([]);
    expect(envelope.data.segments).toEqual([
      {
        id: "children",
        labelFr: "enfants",
        rungs: [{ difficulty: 1, activeQuestionCount: 42 }],
      },
      { id: "adults", labelFr: "adultes", rungs: [] },
    ]);
  });
});

describe("composeQuizSessionHandler", () => {
  // @req REQ-103
  it("returns SEMANTIC_ERROR when the difficulty is outside the segment's rung range", async () => {
    const result = await composeQuizSessionHandler({
      segment: "children",
      difficulty: 5,
      count: 8,
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.code).toBe("SEMANTIC_ERROR");
    }
    expect(composeQuizSessionMock).not.toHaveBeenCalled();
  });

  // @req REQ-103
  it("enriches questions with source refs and entity links", async () => {
    composeQuizSessionMock.mockResolvedValue([
      {
        id: "q-1",
        templateId: "T1",
        audience: "adults",
        difficulty: 3,
        entityType: "people",
        entityId: "PPL_A",
        fieldPath: "languageFamilyId",
        promptFr: "Quelle famille linguistique ?",
        optionsFr: ["Bantu", "Nilotic", "Chadic", "Cushitic"],
        correctOption: 0,
        explanationFr: "Explication",
        assertionId: "assertion-1",
        sourceIds: ["source-1", "source-2"],
      },
    ]);

    const sourcesQuery = buildInQuery({
      data: [
        {
          id: "source-1",
          title: "Ethnologue",
          url: "https://example.org/eth",
          year: 2020,
          tier: "secondary",
        },
        {
          id: "source-2",
          title: "UN report",
          url: "https://example.org/un",
          year: 2021,
          tier: "primary",
        },
      ],
      error: null,
    });
    const peoplesQuery = buildInQuery({
      data: [
        {
          id: "PPL_A",
          content: {
            appellations: { selfAppellation: "Shona", exonyms: ["Mashona"] },
          },
        },
      ],
      error: null,
    });
    fromMock.mockImplementation((table: string) =>
      table === "sources" ? sourcesQuery : peoplesQuery
    );

    const result = await composeQuizSessionHandler({
      segment: "adults",
      difficulty: 3,
      count: 8,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.envelope.data.segment).toBe("adults");
    expect(result.envelope.data.difficulty).toBe(3);
    expect(result.envelope.data.questions).toHaveLength(1);

    const question = result.envelope.data.questions[0];
    expect(question.id).toBe("q-1");
    // Prefers the primary-tier source over the secondary one.
    expect(question.source).toEqual({
      title: "UN report",
      url: "https://example.org/un",
      year: 2021,
      tier: "primary",
    });
    expect(question.entity).toEqual({
      type: "people",
      id: "PPL_A",
      slug: "PPL_A",
      autonym: "Shona",
      exonym: "Mashona",
    });
    expect(question.assertionId).toBe("assertion-1");
  });

  // @req REQ-103
  it("returns an empty question list without querying sources or peoples", async () => {
    composeQuizSessionMock.mockResolvedValue([]);

    const result = await composeQuizSessionHandler({
      segment: "adults",
      difficulty: 3,
      count: 8,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.data.questions).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // @req REQ-103
  it("falls back to a null entity link when the people row cannot be resolved", async () => {
    composeQuizSessionMock.mockResolvedValue([
      {
        id: "q-1",
        templateId: "T1",
        audience: "adults",
        difficulty: 3,
        entityType: "people",
        entityId: "PPL_MISSING",
        fieldPath: "languageFamilyId",
        promptFr: "?",
        optionsFr: ["a", "b", "c", "d"],
        correctOption: 0,
        explanationFr: "Explication",
        assertionId: "assertion-1",
        sourceIds: [],
      },
    ]);

    fromMock.mockImplementation(() => buildInQuery({ data: [], error: null }));

    const result = await composeQuizSessionHandler({
      segment: "adults",
      difficulty: 3,
      count: 8,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.data.questions[0].entity).toEqual({
      type: "people",
      id: "PPL_MISSING",
      slug: "PPL_MISSING",
      autonym: null,
      exonym: null,
    });
    expect(result.envelope.data.questions[0].source).toEqual({
      title: "",
      url: null,
      year: null,
      tier: null,
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const getQuizScopeCatalogueMock = vi.fn();
const getQuizScopeLabelMock = vi.fn();
const composeQuizSessionMock = vi.fn();

vi.mock("@/api/v2/services/quizService", () => ({
  getQuizScopeCatalogue: (...args: unknown[]) =>
    getQuizScopeCatalogueMock(...args),
  getQuizScopeLabel: (...args: unknown[]) => getQuizScopeLabelMock(...args),
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

import { getQuizScopesHandler, composeQuizSessionHandler } from "../quiz";

beforeEach(() => {
  getQuizScopeCatalogueMock.mockReset();
  getQuizScopeLabelMock.mockReset().mockResolvedValue("Ghana");
  composeQuizSessionMock.mockReset();
  fromMock.mockReset();
});

describe("getQuizScopesHandler", () => {
  // @req REQ-103
  it("marks a track playable only when it can fill a session of eight", async () => {
    getQuizScopeCatalogueMock.mockResolvedValue({
      countries: [{ id: "GHA", labelFr: "Ghana", activeQuestionCount: 120 }],
      families: [
        { id: "FLG_KHOISAN", labelFr: "Khoïsan", activeQuestionCount: 4 },
      ],
      themes: [
        {
          id: "noms",
          labelFr: "Noms et appellations",
          activeQuestionCount: 40,
        },
        { id: "croyances", labelFr: "Croyances", activeQuestionCount: 3 },
      ],
      totalActiveQuestionCount: 2504,
    });

    const envelope = await getQuizScopesHandler();

    expect(envelope.meta.license).toBe("CC-BY-SA-4.0");
    expect(envelope.errors).toEqual([]);
    expect(envelope.data.countries[0].playable).toBe(true);
    // Khoïsan holds four questions: listed, counted honestly, not launchable.
    expect(envelope.data.families[0]).toEqual({
      id: "FLG_KHOISAN",
      labelFr: "Khoïsan",
      activeQuestionCount: 4,
      playable: false,
      playableThemeIds: [],
    });
  });

  /**
   * The picker offers a theme on a track only where the track can fill a
   * session of it. Presence, not a number: a theme the country cannot pay for
   * is absent rather than greyed.
   */
  // @req REQ-121
  it("names the themes a track can fill and omits the ones it cannot", async () => {
    getQuizScopeCatalogueMock.mockResolvedValue({
      countries: [
        {
          id: "GHA",
          labelFr: "Ghana",
          activeQuestionCount: 120,
          questionCountByTheme: { croyances: 9, noms: 3, migrations: 8 },
        },
      ],
      families: [],
      themes: [],
      totalActiveQuestionCount: 2504,
    });

    const envelope = await getQuizScopesHandler();

    // Ordered by QUIZ_THEME_IDS, not by count — the picker reads as a table of
    // contents and must not reshuffle as the bank grows.
    expect(envelope.data.countries[0].playableThemeIds).toEqual([
      "croyances",
      "migrations",
    ]);
  });

  /**
   * The picker stops rendering this field in the same lot that adds
   * `playableThemeIds`, which is exactly when a later cleanup deletes it. It is
   * on a public contract; `openapi:diff` would catch the removal, this catches
   * the intent sooner.
   */
  // @req REQ-103
  it("keeps activeQuestionCount on the wire", async () => {
    getQuizScopeCatalogueMock.mockResolvedValue({
      countries: [
        {
          id: "GHA",
          labelFr: "Ghana",
          activeQuestionCount: 120,
          questionCountByTheme: {},
        },
      ],
      families: [],
      themes: [],
      totalActiveQuestionCount: 2504,
    });

    const envelope = await getQuizScopesHandler();

    expect(envelope.data.countries[0].activeQuestionCount).toBe(120);
  });

  // @req REQ-103
  it("offers the two whole-corpus tracks with the bank's own total", async () => {
    getQuizScopeCatalogueMock.mockResolvedValue({
      countries: [],
      families: [],
      themes: [],
      totalActiveQuestionCount: 2504,
    });

    const envelope = await getQuizScopesHandler();

    expect(envelope.data.mixed.activeQuestionCount).toBe(2504);
    expect(envelope.data.random.playable).toBe(true);
  });

  /**
   * A theme too thin to fill a session is listed with its honest count and
   * refused, the same way Khoïsan is on the track axis — hiding it would make
   * the picker look like the corpus covers less than it does.
   */
  // @req REQ-121
  it("offers the content themes, refusing the ones that cannot fill a session", async () => {
    getQuizScopeCatalogueMock.mockResolvedValue({
      countries: [],
      families: [],
      themes: [
        {
          id: "noms",
          labelFr: "Noms et appellations",
          activeQuestionCount: 40,
        },
        { id: "croyances", labelFr: "Croyances", activeQuestionCount: 3 },
      ],
      totalActiveQuestionCount: 43,
    });

    const envelope = await getQuizScopesHandler();

    expect(envelope.data.themes).toEqual([
      {
        id: "noms",
        labelFr: "Noms et appellations",
        activeQuestionCount: 40,
        playable: true,
      },
      {
        id: "croyances",
        labelFr: "Croyances",
        activeQuestionCount: 3,
        playable: false,
      },
    ]);
  });
});

describe("composeQuizSessionHandler", () => {
  // @req REQ-103
  it("returns SEMANTIC_ERROR when the scope names a country the corpus does not hold", async () => {
    getQuizScopeLabelMock.mockResolvedValue(null);

    const result = await composeQuizSessionHandler({
      pays: "ZZZ",
      count: 8,
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.code).toBe("SEMANTIC_ERROR");
    }
    expect(composeQuizSessionMock).not.toHaveBeenCalled();
  });

  /**
   * The defect this refusal exists for: « Djibouti + Migrations » held three
   * questions and dealt a three-round session with the ladder's top rung
   * missing, announcing itself as a track the whole way.
   */
  // @req REQ-103
  it("refuses a pair the bank can only half-fill", async () => {
    composeQuizSessionMock.mockResolvedValue({
      poolSize: 3,
      questions: [{ id: "q-1" }, { id: "q-2" }, { id: "q-3" }],
    });

    const result = await composeQuizSessionHandler({
      pays: "DJI",
      theme: "migrations",
      count: 8,
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.code).toBe("SEMANTIC_ERROR");
    }
  });

  // @req REQ-103
  it("still answers a pool of exactly the session it was asked for", async () => {
    composeQuizSessionMock.mockResolvedValue({ poolSize: 8, questions: [] });

    const result = await composeQuizSessionHandler({ count: 8 });

    expect(result.ok).toBe(true);
  });

  /**
   * A pool the serve-time freshness gate emptied is not a pair the corpus never
   * held, so it keeps its 200 and the client's calm empty state. Measuring the
   * refusal against `poolSize` rather than against the dealt session is the
   * whole point of carrying both numbers.
   */
  // @req REQ-103
  it("does not refuse a fat pool the freshness gate emptied", async () => {
    composeQuizSessionMock.mockResolvedValue({ poolSize: 40, questions: [] });

    const result = await composeQuizSessionHandler({ count: 8 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.data.questions).toEqual([]);
  });

  // @req REQ-103
  it("names the whole-corpus tracks without asking the corpus for a label", async () => {
    composeQuizSessionMock.mockResolvedValue({ poolSize: 0, questions: [] });

    const result = await composeQuizSessionHandler({ count: 8 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.data.scope).toEqual({
      kind: "mixed",
      entityId: null,
      labelFr: "Tout le continent",
    });
    expect(getQuizScopeLabelMock).not.toHaveBeenCalled();
  });

  // @req REQ-103
  it("enriches questions with source refs and entity links", async () => {
    composeQuizSessionMock.mockResolvedValue({
      poolSize: 8,
      questions: [
        {
          id: "q-1",
          templateId: "T1",
          difficulty: 1,
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
      ],
    });

    const sourcesQuery = buildInQuery({
      data: [
        {
          id: "source-1",
          title: "Ethnologue",
          url: "https://example.org/eth",
          year: 2020,
          tier: "referenced",
        },
        {
          id: "source-2",
          title: "UN report",
          url: "https://example.org/un",
          year: 2021,
          tier: "official",
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
      pays: "GHA",
      count: 8,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.envelope.data.scope).toEqual({
      kind: "country",
      entityId: "GHA",
      labelFr: "Ghana",
    });
    expect(result.envelope.data.questions).toHaveLength(1);

    const question = result.envelope.data.questions[0];
    expect(question.id).toBe("q-1");
    // Prefers the primary-tier source over the secondary one.
    expect(question.source).toEqual({
      title: "UN report",
      url: "https://example.org/un",
      year: 2021,
      tier: "official",
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
    composeQuizSessionMock.mockResolvedValue({ poolSize: 0, questions: [] });

    const result = await composeQuizSessionHandler({
      pays: "GHA",
      count: 8,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.data.questions).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // @req REQ-103
  it("falls back to a null entity link when the people row cannot be resolved", async () => {
    composeQuizSessionMock.mockResolvedValue({
      poolSize: 8,
      questions: [
        {
          id: "q-1",
          templateId: "T1",
          difficulty: 1,
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
      ],
    });

    fromMock.mockImplementation(() => buildInQuery({ data: [], error: null }));

    const result = await composeQuizSessionHandler({
      pays: "GHA",
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

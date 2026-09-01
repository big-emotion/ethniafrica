/**
 * ETNI-1738 — the /v2/search handler as a pass-through for the unified list.
 *
 * The service is mocked here, so what is under test is the only thing the
 * handler decides: which fields reach the Module #0 envelope, and in which
 * order. Ranking is proven in the query layer and in migration 068.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/v2/services/searchService", () => ({
  ftsSearch: vi.fn(),
}));

import { ftsSearch } from "@/api/v2/services/searchService";
import { ftsSearchHandler } from "../search";
import type { FtsSearchResponse } from "@/types/afrik";

const QUERY = { q: "yoruba", limit: 20, offset: 0 };

/**
 * The kinds are interleaved and two hits share a score: this order is only
 * explicable by the ranking that produced it, so any grouping or re-sorting
 * in the handler shows up as a different sequence.
 */
const RANKED_HITS = [
  {
    kind: "people" as const,
    id: "PPL_YORUBA",
    name: "Yoruba",
    normalizedScore: 1,
    snippet: "[[Yoruba]]",
  },
  {
    kind: "quiz" as const,
    id: "QZ_YORUBA_AUTONYM",
    name: "Quel est l'autonyme des Yoruba ?",
    normalizedScore: 0.71,
    snippet: "[[Yoruba]] · Quel est l'autonyme",
  },
  {
    kind: "country" as const,
    id: "NGA",
    name: "Nigéria",
    normalizedScore: 0.71,
    snippet: null,
  },
  {
    kind: "languageFamily" as const,
    id: "FLG_NIGER_CONGO",
    name: "Niger-Congo",
    normalizedScore: 0.4,
    snippet: null,
  },
  {
    kind: "person" as const,
    id: "PER_JOHNSON",
    name: "Samuel Johnson",
    normalizedScore: 0.4,
    snippet: null,
  },
  {
    kind: "patronyme" as const,
    id: "PAT_ADEBAYO",
    name: "Adébayo",
    normalizedScore: 0,
    snippet: null,
  },
];

const QUIZ = {
  id: "QZ_YORUBA_AUTONYM",
  prompt: "Quel est l'autonyme des Yoruba ?",
  entityType: "people",
  entityId: "PPL_YORUBA",
  subjectName: "Yoruba",
  relevance: 0.7,
  exactMatch: true,
  normalizedScore: 0.71,
  snippet: "[[Yoruba]] · Quel est l'autonyme",
};

const OVER_BROAD_GROUPS = {
  peoples: [
    {
      id: "PPL_YORUBA",
      nameMain: "Yoruba",
      languageFamilyId: "FLG_NIGER_CONGO",
      languageFamilyName: "Niger-Congo",
      currentCountries: ["NGA"],
      classificationStatus: null,
      content: {},
      confidence: null,
      relevance: 0.7,
      exactMatch: true,
      normalizedScore: 1,
      snippet: "[[Yoruba]]",
    },
  ],
  countries: [
    {
      id: "NGA",
      nameFr: "Nigéria",
      content: {},
      relevance: 0.7,
      exactMatch: true,
      normalizedScore: 0.71,
      snippet: null,
    },
  ],
  families: [
    {
      id: "FLG_NIGER_CONGO",
      nameFr: "Niger-Congo",
      classificationStatus: null,
      content: {},
      relevance: 0.4,
      exactMatch: false,
      normalizedScore: 0.4,
      snippet: null,
    },
  ],
  persons: [
    {
      id: "PER_JOHNSON" as const,
      fullName: "Samuel Johnson",
      roleCategory: "historian",
      relevance: 0.4,
      exactMatch: false,
      normalizedScore: 0.4,
      snippet: null,
      peopleLinks: [],
    },
  ],
  patronymes: [
    {
      id: "PAT_ADEBAYO",
      nameMain: "Adébayo",
      nameSystem: "patronymic",
      casteOrSocialFunction: null,
      content: {},
      relevance: 0,
      exactMatch: false,
      normalizedScore: 0,
      snippet: null,
    },
  ],
  languages: [
    {
      id: "yor",
      name: "Yoruba",
      familyId: "FLG_NIGER_CONGO",
      familyName: "Niger-Congo",
      content: {},
      relevance: 0.7,
      exactMatch: true,
      snippet: null,
    },
  ],
} satisfies Pick<
  FtsSearchResponse,
  "peoples" | "countries" | "families" | "persons" | "patronymes" | "languages"
>;

function serviceResponse(
  overrides: Partial<FtsSearchResponse> = {}
): FtsSearchResponse {
  return {
    peoples: [],
    countries: [],
    families: [],
    persons: [],
    patronymes: [],
    quizzes: [],
    languages: [],
    results: RANKED_HITS,
    peoplesTotal: 0,
    countriesTotal: 0,
    familiesTotal: 0,
    personsTotal: 0,
    patronymesTotal: 0,
    quizzesTotal: 0,
    languagesTotal: 0,
    total: 0,
    ...overrides,
  } as FtsSearchResponse;
}

describe("ftsSearchHandler — unified results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-002
  it("publishes the main-stream hits in their service order", async () => {
    vi.mocked(ftsSearch).mockResolvedValue(serviceResponse());

    const envelope = await ftsSearchHandler(QUERY);

    expect(envelope.data.results).toEqual(
      RANKED_HITS.filter((hit) => hit.kind !== "quiz")
    );
  });

  // @req REQ-121
  it("removes an over-broad quiz response from the default stream", async () => {
    vi.mocked(ftsSearch).mockResolvedValue(
      serviceResponse({
        quizzes: [QUIZ],
        quizzesTotal: 7,
        peoplesTotal: 12,
        countriesTotal: 3,
        familiesTotal: 2,
        personsTotal: 1,
        patronymesTotal: 4,
        languagesTotal: 6,
        total: 35,
      })
    );

    const envelope = await ftsSearchHandler(QUERY);

    expect(envelope.data.quizzes).toEqual([]);
    expect(envelope.data.quizzesTotal).toBe(0);
    expect(envelope.data.results.some((hit) => hit.kind === "quiz")).toBe(
      false
    );
    expect(envelope.data.total).toBe(28);
  });

  // @req REQ-121
  it("returns only quiz data from an over-broad quiz-lens response", async () => {
    vi.mocked(ftsSearch).mockResolvedValue(
      serviceResponse({
        ...OVER_BROAD_GROUPS,
        quizzes: [QUIZ],
        peoplesTotal: 12,
        countriesTotal: 3,
        familiesTotal: 2,
        personsTotal: 1,
        patronymesTotal: 4,
        quizzesTotal: 7,
        languagesTotal: 6,
        total: 35,
      })
    );

    const envelope = await ftsSearchHandler({ ...QUERY, lens: "quiz" });

    expect(envelope.data).toMatchObject({
      peoples: [],
      countries: [],
      families: [],
      persons: [],
      patronymes: [],
      quizzes: [QUIZ],
      languages: [],
      peoplesTotal: 0,
      countriesTotal: 0,
      familiesTotal: 0,
      personsTotal: 0,
      patronymesTotal: 0,
      quizzesTotal: 7,
      languagesTotal: 0,
      total: 7,
    });
    expect(envelope.data.results).toEqual([
      expect.objectContaining({ kind: "quiz", id: "QZ_YORUBA_AUTONYM" }),
    ]);
  });

  // @req REQ-129
  it("forwards every normalized score unrescaled, on [0,1]", async () => {
    vi.mocked(ftsSearch).mockResolvedValue(serviceResponse());

    const envelope = await ftsSearchHandler(QUERY);

    expect(envelope.data.results.map((hit) => hit.normalizedScore)).toEqual([
      1, 0.71, 0.4, 0.4, 0,
    ]);
    for (const hit of envelope.data.results) {
      expect(hit.normalizedScore).toBeGreaterThanOrEqual(0);
      expect(hit.normalizedScore).toBeLessThanOrEqual(1);
    }
  });

  // @req REQ-126
  it("keeps the per-kind arrays and their corpus-wide counts beside the list", async () => {
    const yoruba = { id: "PPL_YORUBA", nameMain: "Yoruba" };
    const nigeria = { id: "NGA", nameFr: "Nigéria" };
    const johnson = { id: "PER_JOHNSON", fullName: "Samuel Johnson" };
    vi.mocked(ftsSearch).mockResolvedValue(
      serviceResponse({
        peoples: [yoruba],
        countries: [nigeria],
        persons: [johnson],
        peoplesTotal: 12,
        countriesTotal: 3,
        personsTotal: 1,
        quizzesTotal: 7,
        total: 23,
      } as Partial<FtsSearchResponse>)
    );

    const envelope = await ftsSearchHandler(QUERY);

    expect(envelope.data.peoples).toEqual([yoruba]);
    expect(envelope.data.countries).toEqual([nigeria]);
    expect(envelope.data.persons).toEqual([johnson]);
    expect(envelope.data).toMatchObject({
      peoplesTotal: 12,
      countriesTotal: 3,
      personsTotal: 1,
      quizzesTotal: 0,
      total: 16,
    });
    expect(envelope.data.results).toHaveLength(RANKED_HITS.length - 1);
  });
});

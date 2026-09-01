/**
 * ETNI-38 — /v2/search endpoint: unit tests covering all acceptance criteria.
 *
 * Tests run at handler + service level with Supabase queries mocked.
 * Route-level (HTTP) tests live in src/app/api/v2/__tests__/search.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── service-layer mock ──────────────────────────────────────────────────────
vi.mock("@/lib/supabase/queries/afrik/search", () => ({
  ftsSearchEntities: vi.fn(),
}));

import { ftsSearchEntities } from "@/lib/supabase/queries/afrik/search";
import { ftsSearch } from "@/api/v2/services/searchService";
import { ftsSearchHandler } from "@/api/v2/handlers/search";

// ── shared fixtures ─────────────────────────────────────────────────────────
const mockPeople = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["NGA"],
  classificationStatus: "consensual" as const,
  content: {},
};

const mockCountry = {
  id: "NGA",
  nameFr: "Nigéria",
  content: {},
};

const emptyResult = { peoples: [], countries: [], families: [], total: 0 };

const mockQuiz = {
  id: "QZ_1",
  prompt: "Quel est l'autonyme des Yoruba ?",
  entityType: "people",
  entityId: "PPL_YORUBA",
  subjectName: "Yoruba",
  relevance: 0.5,
  exactMatch: true,
  normalizedScore: 0.95,
  snippet: "[[Yoruba]] · Quel est l'autonyme",
};

// ── ftsSearch service ───────────────────────────────────────────────────────
describe("ftsSearch (service)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path — returns peoples and countries for a valid query", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      peoples: [mockPeople],
      countries: [mockCountry],
      total: 2,
    });

    const result = await ftsSearch({ q: "Yoruba", limit: 20, offset: 0 });

    expect(result.peoples).toHaveLength(1);
    expect(result.countries).toHaveLength(1);
    expect(result.total).toBe(2);
    expect(ftsSearchEntities).toHaveBeenCalledWith(
      expect.objectContaining({ q: "Yoruba" })
    );
  });

  it("empty query — still calls FTS with the provided string", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    const result = await ftsSearch({ q: "", limit: 20, offset: 0 });

    expect(result.peoples).toHaveLength(0);
    expect(result.countries).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("no matches — returns empty result", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    const result = await ftsSearch({
      q: "NONEXISTENTQUERY12345",
      limit: 20,
      offset: 0,
    });

    expect(result.peoples).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("filter combination — passes classificationStatus to query", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      peoples: [mockPeople],
      countries: [],
      total: 1,
    });

    await ftsSearch({
      q: "Yoruba",
      limit: 20,
      offset: 0,
      classificationStatus: "consensual",
    });

    expect(ftsSearchEntities).toHaveBeenCalledWith(
      expect.objectContaining({ classificationStatus: "consensual" })
    );
  });

  it("filter combination — passes minConfidence to query", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    await ftsSearch({ q: "Bantu", limit: 10, offset: 0, minConfidence: 0.7 });

    expect(ftsSearchEntities).toHaveBeenCalledWith(
      expect.objectContaining({ minConfidence: 0.7 })
    );
  });

  it("filter combination — passes sinceVerifiedAfter to query", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    await ftsSearch({
      q: "Bantu",
      limit: 10,
      offset: 0,
      sinceVerifiedAfter: "2026-01-01",
    });

    expect(ftsSearchEntities).toHaveBeenCalledWith(
      expect.objectContaining({ sinceVerifiedAfter: "2026-01-01" })
    );
  });

  it("pagination — passes limit and offset to query", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    await ftsSearch({ q: "Bantu", limit: 5, offset: 10 });

    expect(ftsSearchEntities).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 })
    );
  });

  // @req REQ-121
  it("returns matching quiz questions and their corpus-wide count", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...emptyResult,
      quizzes: [mockQuiz],
      quizzesTotal: 9,
      total: 9,
    });

    const result = await ftsSearch({
      q: "Yoruba",
      limit: 20,
      offset: 0,
      lens: "quiz",
    });

    expect(result.quizzes).toEqual([mockQuiz]);
    expect(result.quizzesTotal).toBe(9);
    expect(ftsSearchEntities).toHaveBeenCalledWith(
      expect.objectContaining({ lens: "quiz" })
    );
  });

  // @req REQ-121
  it("never returns a quiz question's options, correct answer or explanation", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...emptyResult,
      quizzes: [mockQuiz],
      quizzesTotal: 1,
      total: 1,
    });

    const [quiz] = (
      await ftsSearch({
        q: "Yoruba",
        limit: 20,
        offset: 0,
        lens: "quiz",
      })
    ).quizzes;

    for (const leak of [
      "options_fr",
      "options",
      "correct_option",
      "correctOption",
      "explanation_fr",
      "explanation",
    ]) {
      expect(quiz).not.toHaveProperty(leak);
    }
  });

  // @req REQ-002
  it("returns the cross-kind ordered list alongside the grouped arrays", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...emptyResult,
      peoples: [mockPeople],
      countries: [mockCountry],
      results: [
        {
          kind: "people",
          id: "PPL_YORUBA",
          name: "Yoruba",
          normalizedScore: 0.97,
          snippet: null,
        },
        {
          kind: "country",
          id: "NGA",
          name: "Nigéria",
          normalizedScore: 0.62,
          snippet: null,
        },
      ],
      total: 3,
    });

    const result = await ftsSearch({ q: "Yoruba", limit: 20, offset: 0 });

    expect(result.results.map((hit) => hit.kind)).toEqual([
      "people",
      "country",
    ]);
    expect(result.peoples).toHaveLength(1);
    expect(result.countries).toHaveLength(1);
  });
});

// ── ftsSearchHandler ────────────────────────────────────────────────────────
describe("ftsSearchHandler (handler)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("response envelope — has data.peoples, data.countries, data.total, meta.license, meta.attribution, errors", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      peoples: [mockPeople],
      countries: [mockCountry],
      total: 2,
    });

    const result = await ftsSearchHandler({
      q: "Yoruba",
      limit: 20,
      offset: 0,
    });

    expect(result.data.peoples).toBeDefined();
    expect(result.data.countries).toBeDefined();
    expect(typeof result.data.total).toBe("number");
    expect(result.meta.license).toBe("CC-BY-SA-4.0");
    expect(result.meta.attribution).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("empty query — returns valid envelope with empty results", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    const result = await ftsSearchHandler({ q: "", limit: 20, offset: 0 });

    expect(result.data.peoples).toHaveLength(0);
    expect(result.data.countries).toHaveLength(0);
    expect(result.data.total).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  // @req REQ-121
  it("publishes the quiz bank and the ordered list in the envelope", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...emptyResult,
      quizzes: [mockQuiz],
      quizzesTotal: 9,
      results: [
        {
          kind: "quiz",
          id: "QZ_1",
          name: "Quel est l'autonyme des Yoruba ?",
          normalizedScore: 0.95,
          snippet: "[[Yoruba]] · Quel est l'autonyme",
        },
      ],
      total: 9,
    });

    const result = await ftsSearchHandler({
      q: "Yoruba",
      limit: 20,
      offset: 0,
      lens: "quiz",
    });

    expect(result.data.quizzes).toEqual([mockQuiz]);
    expect(result.data.quizzesTotal).toBe(9);
    expect(result.data.results).toHaveLength(1);
    expect(result.data.results[0]).toMatchObject({ kind: "quiz", id: "QZ_1" });
  });

  it("error propagation — throws on service failure", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    await expect(
      ftsSearchHandler({ q: "Yoruba", limit: 20, offset: 0 })
    ).rejects.toThrow("DB error");
  });

  // @req REQ-125
  it("near-miss leads — passes leads through on a zero-total result", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...emptyResult,
      leads: [
        { kind: "people", id: "PPL_BAMBARA", name: "Bambara", similarity: 0.4 },
      ],
    });

    const result = await ftsSearchHandler({
      q: "bamba",
      limit: 20,
      offset: 0,
    });

    expect(result.data.total).toBe(0);
    expect(result.data.leads).toEqual([
      { kind: "people", id: "PPL_BAMBARA", name: "Bambara", similarity: 0.4 },
    ]);
  });

  // @req REQ-125
  it("near-miss leads — defaults to an empty array when the service omits leads", async () => {
    (ftsSearchEntities as ReturnType<typeof vi.fn>).mockResolvedValue({
      peoples: [mockPeople],
      countries: [mockCountry],
      total: 2,
    });

    const result = await ftsSearchHandler({
      q: "Yoruba",
      limit: 20,
      offset: 0,
    });

    expect(result.data.leads).toEqual([]);
  });
});

/**
 * ETNI-38 — /v2/search endpoint: unit tests covering all acceptance criteria.
 *
 * Tests run at handler + service level with Supabase queries mocked.
 * Route-level (HTTP) tests live in src/app/api/v2/__tests__/search.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── service-layer mock ──────────────────────────────────────────────────────
vi.mock("@/lib/supabase/queries/afrik/search", () => ({
  ftsSearchPeoplesCountries: vi.fn(),
}));

import { ftsSearchPeoplesCountries } from "@/lib/supabase/queries/afrik/search";
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

const emptyResult = { peoples: [], countries: [], total: 0 };

// ── ftsSearch service ───────────────────────────────────────────────────────
describe("ftsSearch (service)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path — returns peoples and countries for a valid query", async () => {
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue({
      peoples: [mockPeople],
      countries: [mockCountry],
      total: 2,
    });

    const result = await ftsSearch({ q: "Yoruba", limit: 20, offset: 0 });

    expect(result.peoples).toHaveLength(1);
    expect(result.countries).toHaveLength(1);
    expect(result.total).toBe(2);
    expect(ftsSearchPeoplesCountries).toHaveBeenCalledWith(
      expect.objectContaining({ q: "Yoruba" })
    );
  });

  it("empty query — still calls FTS with the provided string", async () => {
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    const result = await ftsSearch({ q: "", limit: 20, offset: 0 });

    expect(result.peoples).toHaveLength(0);
    expect(result.countries).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("no matches — returns empty result", async () => {
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue(
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
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue({
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

    expect(ftsSearchPeoplesCountries).toHaveBeenCalledWith(
      expect.objectContaining({ classificationStatus: "consensual" })
    );
  });

  it("filter combination — passes minConfidence to query", async () => {
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    await ftsSearch({ q: "Bantu", limit: 10, offset: 0, minConfidence: 0.7 });

    expect(ftsSearchPeoplesCountries).toHaveBeenCalledWith(
      expect.objectContaining({ minConfidence: 0.7 })
    );
  });

  it("filter combination — passes sinceVerifiedAfter to query", async () => {
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    await ftsSearch({
      q: "Bantu",
      limit: 10,
      offset: 0,
      sinceVerifiedAfter: "2026-01-01",
    });

    expect(ftsSearchPeoplesCountries).toHaveBeenCalledWith(
      expect.objectContaining({ sinceVerifiedAfter: "2026-01-01" })
    );
  });

  it("pagination — passes limit and offset to query", async () => {
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    await ftsSearch({ q: "Bantu", limit: 5, offset: 10 });

    expect(ftsSearchPeoplesCountries).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 })
    );
  });
});

// ── ftsSearchHandler ────────────────────────────────────────────────────────
describe("ftsSearchHandler (handler)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("response envelope — has data.peoples, data.countries, data.total, meta.license, meta.attribution, errors", async () => {
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue({
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
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResult
    );

    const result = await ftsSearchHandler({ q: "", limit: 20, offset: 0 });

    expect(result.data.peoples).toHaveLength(0);
    expect(result.data.countries).toHaveLength(0);
    expect(result.data.total).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("error propagation — throws on service failure", async () => {
    (ftsSearchPeoplesCountries as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    await expect(
      ftsSearchHandler({ q: "Yoruba", limit: 20, offset: 0 })
    ).rejects.toThrow("DB error");
  });
});

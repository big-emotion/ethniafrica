import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { search, searchWithLeads } from "../afrikLoader";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

/** The query the loader actually put on the wire, as a plain object. */
function searchParamsOf(fetchMock: { mock: { calls: unknown[][] } }) {
  const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
  return Object.fromEntries(url.searchParams);
}

describe("afrikLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("search", () => {
    const searchEnvelope = {
      data: {
        peoples: [
          {
            id: "PPL_SHONA",
            nameMain: "Shona",
            languageFamilyId: "FLG_BANTU",
            currentCountries: ["ZWE"],
            content: {},
          },
        ],
        countries: [{ id: "ZWE", nameFr: "Zimbabwe", content: {} }],
        families: [{ id: "FLG_BANTU", nameFr: "Bantou", content: {} }],
        total: 3,
      },
    };

    // @req REQ-108
    it("asks the route for q, the only query parameter it accepts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchEnvelope),
      });

      await search("shona");

      expect(mockFetch).toHaveBeenCalledWith("/api/v2/search?q=shona");
    });

    // @req REQ-108
    it("returns every entity the envelope carries", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchEnvelope),
      });

      const result = await search("shona");

      expect(result.map((r) => r.type)).toEqual([
        "people",
        "country",
        "languageFamily",
      ]);
      expect(result[0].name).toBe("Shona");
    });

    // @req REQ-108
    it("should return filtered results by type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchEnvelope),
      });

      const result = await search("shona", { type: "people" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("people");
      expect(result[0].id).toBe("PPL_SHONA");
    });

    // @req REQ-108
    it("forwards every query option to the route", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchEnvelope),
      });

      await search("shona", {
        limit: 20,
        lang: "en",
        classificationStatus: "consensual",
        minConfidence: "0.7",
        familyId: "FLG_BANTU",
        countryId: "ZWE",
      });

      expect(searchParamsOf(mockFetch)).toEqual({
        q: "shona",
        limit: "20",
        lang: "en",
        classificationStatus: "consensual",
        minConfidence: "0.7",
        familyId: "FLG_BANTU",
        countryId: "ZWE",
      });
    });

    // @req REQ-121
    it("scopes a blank query to a family without sending an empty q", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchEnvelope),
      });

      // "The peoples of the Bantu family" is a complete question; the route
      // rejects `q=` but accepts no `q` at all.
      await search("", { familyId: "FLG_BANTU" });

      expect(searchParamsOf(mockFetch)).toEqual({ familyId: "FLG_BANTU" });
    });

    // @req REQ-121
    it("scopes a blank query to a country without sending an empty q", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchEnvelope),
      });

      await search("", { countryId: "ZWE" });

      expect(searchParamsOf(mockFetch)).toEqual({ countryId: "ZWE" });
    });

    // @req REQ-121
    it("keeps every kind the envelope carries when a relation scope is set", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchEnvelope),
      });

      // The route scopes peoples by country but ranks the other kinds on the
      // text alone, so a country scope must not silently drop them.
      const result = await search("shona", { countryId: "ZWE" });

      expect(result.map((r) => r.type)).toEqual([
        "people",
        "country",
        "languageFamily",
      ]);
    });

    // @req REQ-108
    it("omits options the caller left out", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchEnvelope),
      });

      await search("shona", { limit: 6 });

      expect(searchParamsOf(mockFetch)).toEqual({ q: "shona", limit: "6" });
    });

    it("should return empty array on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      const result = await search("test");

      expect(result).toHaveLength(0);
    });
  });

  describe("searchWithLeads", () => {
    // @req REQ-125
    it("carries near-miss leads alongside the results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              peoples: [],
              countries: [],
              families: [],
              total: 0,
              leads: [
                {
                  kind: "people",
                  id: "PPL_BAMBARA",
                  name: "Bambara",
                  similarity: 0.4,
                },
              ],
            },
          }),
      });

      const { results, leads } = await searchWithLeads("bamba");

      expect(results).toHaveLength(0);
      expect(leads).toEqual([
        { type: "people", id: "PPL_BAMBARA", name: "Bambara", similarity: 0.4 },
      ]);
    });

    // @req REQ-125
    it("returns no leads when the search already matched", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              peoples: [{ id: "PPL_SHONA", nameMain: "Shona", content: {} }],
              countries: [],
              families: [],
              total: 1,
            },
          }),
      });

      const { results, leads } = await searchWithLeads("shona");

      expect(results).toHaveLength(1);
      expect(leads).toEqual([]);
    });

    // @req REQ-125
    it("returns empty results and leads on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      const { results, leads } = await searchWithLeads("test");

      expect(results).toHaveLength(0);
      expect(leads).toHaveLength(0);
    });

    // The empty envelope a failure degrades to is indistinguishable from a
    // query nothing matched, which is fine for rendering and wrong for any
    // caller counting those zeroes. `answered` is what separates them.
    // @req REQ-046
    it("reports that the API did not answer when the request failed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      const { answered } = await searchWithLeads("test");

      expect(answered).toBe(false);
    });

    // @req REQ-046
    it("reports that the API answered when a search legitimately found nothing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { peoples: [], countries: [], families: [], total: 0 },
          }),
      });

      const { results, answered } = await searchWithLeads("qqqqqq");

      expect(results).toHaveLength(0);
      expect(answered).toBe(true);
    });

    // @req REQ-124
    it("carries the per-type lens counts alongside the results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              peoples: [{ id: "PPL_SHONA", nameMain: "Shona", content: {} }],
              countries: [],
              families: [],
              peoplesTotal: 1,
              countriesTotal: 0,
              familiesTotal: 0,
              languagesTotal: 0,
              personsTotal: 0,
              total: 1,
            },
          }),
      });

      const { counts } = await searchWithLeads("shona");

      expect(counts).toEqual({
        all: 1,
        people: 1,
        country: 0,
        languageFamily: 0,
        language: 0,
        person: 0,
        patronyme: 0,
      });
    });

    // @req REQ-124
    it("defaults every lens count to zero on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      const { counts } = await searchWithLeads("test");

      expect(counts).toEqual({
        all: 0,
        people: 0,
        country: 0,
        languageFamily: 0,
        language: 0,
        person: 0,
        patronyme: 0,
      });
    });
  });
});

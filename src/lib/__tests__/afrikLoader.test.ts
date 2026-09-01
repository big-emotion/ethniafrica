import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLanguageFamilies, search } from "../afrikLoader";

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

  describe("getLanguageFamilies", () => {
    it("should return paginated language families", async () => {
      const mockResponse = {
        data: [
          {
            id: "FLG_BANTU",
            name_fr: "Bantou",
            name_en: "Bantu",
            content: {
              generalInfo: {
                totalSpeakers: 350000000,
                numberOfLanguages: 500,
                geographicArea: "Sub-Saharan Africa",
              },
              associatedPeoples: [{ id: "PPL_SHONA" }, { id: "PPL_ZULU" }],
            },
          },
        ],
        meta: {
          total: 24,
          page: 1,
          perPage: 20,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getLanguageFamilies(1, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v2/language-families?page=1&perPage=20"
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("FLG_BANTU");
      expect(result.data[0].nameFr).toBe("Bantou");
      expect(result.meta.total).toBe(24);
    });

    // @req REQ-108
    it("should read peopleCount from the row-computed API field, not fiche-declared content", async () => {
      const mockResponse = {
        data: [
          {
            id: "FLG_BANTU",
            name_fr: "Bantou",
            peopleCount: 28,
            content: {
              // Stale fiche-declared list — must not be used for the count.
              associatedPeoples: [{ id: "PPL_SHONA" }],
            },
          },
          {
            id: "FLG_EMPTY",
            name_fr: "Empty",
            peopleCount: 0,
            content: {},
          },
        ],
        meta: { total: 2, page: 1, perPage: 20 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getLanguageFamilies(1, 20);

      expect(result.data[0].peopleCount).toBe(28);
      // A real zero must render, not be dropped as undefined.
      expect(result.data[1].peopleCount).toBe(0);
    });

    // @req REQ-108
    it("should carry unclassifiedPeoplesCount through to the frontend meta", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: {
              total: 20,
              page: 1,
              perPage: 20,
              unclassifiedPeoplesCount: 64,
            },
          }),
      });

      const result = await getLanguageFamilies(1, 20);

      expect(result.meta.unclassifiedPeoplesCount).toBe(64);
    });

    it("should return empty data on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      const result = await getLanguageFamilies();

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
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
        classificationStatus: "consensual",
        minConfidence: "0.7",
        familyId: "FLG_BANTU",
        countryId: "ZWE",
      });

      expect(searchParamsOf(mockFetch)).toEqual({
        q: "shona",
        limit: "20",
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

  describe("error handling", () => {
    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getLanguageFamilies();

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it("should handle invalid JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const result = await getLanguageFamilies();

      expect(result.data).toHaveLength(0);
    });
  });
});

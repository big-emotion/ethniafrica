import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getLanguageFamilies,
  getLanguageFamily,
  getPeoples,
  getPeople,
  getCountries,
  getCountry,
  search,
  getStats,
} from "../afrikLoader";

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

  describe("getLanguageFamily", () => {
    it("should return a single language family with content", async () => {
      const mockResponse = {
        data: {
          id: "FLG_BANTU",
          name_fr: "Bantou",
          name_en: "Bantu",
          content: {
            generalInfo: {
              branches: ["Eastern Bantu", "Western Bantu"],
              totalSpeakers: 350000000,
            },
            associatedPeoples: [
              { id: "PPL_SHONA", name: "Shona" },
              { id: "PPL_ZULU", name: "Zulu" },
            ],
            sources: ["Ethnologue", "Glottolog"],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getLanguageFamily("FLG_BANTU");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v2/language-families/FLG_BANTU"
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe("FLG_BANTU");
      expect(result?.nameFr).toBe("Bantou");
      expect(result?.generalInfo?.branches).toContain("Eastern Bantu");
    });

    it("should return null for 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: "Not found" } }),
      });

      const result = await getLanguageFamily("FLG_UNKNOWN");

      expect(result).toBeNull();
    });
  });

  describe("getPeoples", () => {
    it("should return paginated peoples", async () => {
      const mockResponse = {
        data: [
          {
            id: "PPL_SHONA",
            name_main: "Shona",
            language_family_id: "FLG_BANTU",
            current_countries: ["ZWE", "MOZ"],
            content: {
              demography: { totalPopulation: 15000000 },
              appellations: { selfAppellation: "Shona" },
            },
          },
        ],
        meta: {
          total: 592,
          page: 1,
          perPage: 20,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getPeoples({ page: 1, perPage: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v2/peoples?page=1&perPage=20"
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("PPL_SHONA");
      expect(result.data[0].nameMain).toBe("Shona");
    });

    it("should return empty data on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      const result = await getPeoples();

      expect(result.data).toHaveLength(0);
    });
  });

  describe("getPeople", () => {
    it("should return people with all 8 AFRIK sections", async () => {
      const mockResponse = {
        data: {
          id: "PPL_SHONA",
          name_main: "Shona",
          language_family_id: "FLG_BANTU",
          current_countries: ["ZWE", "MOZ"],
          content: {
            appellations: {
              mainName: "Shona",
              selfAppellation: "vaShona",
              exonyms: ["Mashona"],
            },
            ethnicities: ["Karanga", "Zezuru", "Manyika"],
            origins: {
              ancientOrigins: "Bantu migrations from Central Africa",
              formationPeriod: "11th-15th century",
            },
            organization: {
              traditionalPoliticalSystem: "Kingdom structure",
            },
            languages: {
              mainLanguage: "Shona",
              isoCodes: ["sna"],
            },
            culture: {
              divinitiesAndSpirits: {
                supremeDeity: { name: "Mwari" },
              },
            },
            historicalRole: {
              kingdomsOrChiefdoms: "Great Zimbabwe, Mutapa Empire",
            },
            demography: {
              totalPopulation: 15000000,
              referenceYear: 2025,
              distributionByCountry: [
                { country: "ZWE", percentage: 80 },
                { country: "MOZ", percentage: 20 },
              ],
            },
            sources: ["Ethnologue", "UNESCO"],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getPeople("PPL_SHONA");

      expect(mockFetch).toHaveBeenCalledWith("/api/v2/peoples/PPL_SHONA");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("PPL_SHONA");
      expect(result?.appellations?.selfAppellation).toBe("vaShona");
      expect(result?.ethnicities).toContain("Karanga");
      expect(result?.origins?.ancientOrigins).toContain("Bantu migrations");
      expect(result?.organization?.traditionalPoliticalSystem).toBe(
        "Kingdom structure"
      );
      expect(result?.languages?.mainLanguage).toBe("Shona");
      expect(result?.culture?.divinitiesAndSpirits?.supremeDeity?.name).toBe(
        "Mwari"
      );
      expect(result?.historicalRole?.kingdomsOrChiefdoms).toContain(
        "Great Zimbabwe"
      );
      expect(result?.demography?.totalPopulation).toBe(15000000);
    });

    it("should return null for 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: "Not found" } }),
      });

      const result = await getPeople("PPL_UNKNOWN");

      expect(result).toBeNull();
    });
  });

  describe("getCountries", () => {
    it("should return paginated countries", async () => {
      const mockResponse = {
        data: [
          {
            id: "ZWE",
            name_fr: "Zimbabwe",
            name_official: "Republic of Zimbabwe",
            content: {
              majorPeoples: [{ id: "PPL_SHONA" }],
              demographics: { totalPopulation: 16000000 },
            },
          },
        ],
        meta: {
          total: 55,
          page: 1,
          perPage: 20,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getCountries(1, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v2/countries?page=1&perPage=20"
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("ZWE");
      expect(result.data[0].nameFr).toBe("Zimbabwe");
    });
  });

  describe("getCountry", () => {
    it("should return country with AFRIK data", async () => {
      const mockResponse = {
        data: {
          id: "ZWE",
          name_fr: "Zimbabwe",
          name_official: "Republic of Zimbabwe",
          etymology: "House of Stone",
          content: {
            historicalNames: {
              precolonial: "Mwenemutapa",
              colonization: "Southern Rhodesia",
            },
            kingdoms: [
              { name: "Great Zimbabwe", period: "1100-1450" },
              { name: "Mutapa Empire", period: "1450-1629" },
            ],
            majorPeoples: [
              { id: "PPL_SHONA", percentage: 70 },
              { id: "PPL_NDEBELE", percentage: 20 },
            ],
            sources: ["UN", "World Bank"],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getCountry("ZWE");

      expect(mockFetch).toHaveBeenCalledWith("/api/v2/countries/ZWE");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("ZWE");
      expect(result?.etymology).toBe("House of Stone");
      expect(result?.historicalNames?.colonization).toBe("Southern Rhodesia");
      expect(result?.kingdoms).toHaveLength(2);
    });

    it("should return null for 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: "Not found" } }),
      });

      const result = await getCountry("XXX");

      expect(result).toBeNull();
    });
  });

  describe("search", () => {
    it("should return filtered results by type", async () => {
      const mockResponse = {
        data: [
          {
            type: "people",
            id: "PPL_SHONA",
            name: "Shona",
            snippet: "The Shona people...",
            relevance: 0.95,
            language_family_id: "FLG_BANTU",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await search("shona", { type: "people" });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v2/search?query=shona&type=people"
      );
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("people");
      expect(result[0].id).toBe("PPL_SHONA");
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

  describe("getStats", () => {
    it("should aggregate stats from endpoints", async () => {
      // Mock three parallel requests
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ meta: { total: 24 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ meta: { total: 592 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ meta: { total: 55 } }),
        });

      const result = await getStats();

      expect(result.totalLanguageFamilies).toBe(24);
      expect(result.totalPeoples).toBe(592);
      expect(result.totalCountries).toBe(55);
      expect(result.totalPopulation).toBe(1_400_000_000);
    });

    it("should return zeros on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getStats();

      expect(result.totalLanguageFamilies).toBe(0);
      expect(result.totalPeoples).toBe(0);
      expect(result.totalCountries).toBe(0);
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

      const result = await getPeoples();

      expect(result.data).toHaveLength(0);
    });
  });
});

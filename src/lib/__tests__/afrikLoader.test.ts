import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getLanguageFamilies,
  getLanguageFamily,
  getPeoples,
  getPeople,
  getCountries,
  getAllCountries,
  getCountry,
  search,
  getStats,
  getUnclassifiedPeoplesCount,
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

  describe("getUnclassifiedPeoplesCount", () => {
    // @req REQ-108
    it("should return the unclassified count from the list meta", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: {
              total: 20,
              page: 1,
              perPage: 1,
              unclassifiedPeoplesCount: 64,
            },
          }),
      });

      const result = await getUnclassifiedPeoplesCount();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v2/language-families?page=1&perPage=1"
      );
      expect(result).toBe(64);
    });

    // @req REQ-108
    it("should return 0 on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      const result = await getUnclassifiedPeoplesCount();

      expect(result).toBe(0);
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

    // @req REQ-033
    it("should map canonical associated peoples from the top-level response", async () => {
      const mockResponse = {
        data: {
          id: "FLG_AFROASIATIQUE",
          nameFr: "Afro-asiatique",
          associatedPeoples: [
            { name: "Amhara", peopleId: "PPL_AMHARA" },
            { name: "Oromo", peopleId: "PPL_OROMO" },
          ],
          content: {
            generalInfo: {
              geographicArea: "North and East Africa",
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getLanguageFamily("FLG_AFROASIATIQUE");

      expect(result?.associatedPeoples).toEqual([
        { name: "Amhara", peopleId: "PPL_AMHARA" },
        { name: "Oromo", peopleId: "PPL_OROMO" },
      ]);
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

    // @req REQ-033
    it("should serialize optional people filters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { total: 0, page: 2, perPage: 10 },
          }),
      });

      await getPeoples({
        page: 2,
        perPage: 10,
        search: "Yoruba people",
        letter: "Y",
        languageFamilyId: "FLG_NIGER_CONGO",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v2/peoples?page=2&perPage=10&search=Yoruba+people&letter=Y&languageFamilyId=FLG_NIGER_CONGO"
      );
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
              spiritualities: "Culte de Mwari, dieu créateur",
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
      expect(result?.culture?.spiritualities).toContain("Mwari");
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
      expect(result.data[0].nameOfficial).toBe("Republic of Zimbabwe");
      expect(result.data[0].nameCommonFr).toBe("Zimbabwe");
    });

    // @req REQ-002
    it("preserves source nameFr as the official name when no separate official name exists", async () => {
      const officialName =
        "République d'Afrique du Sud (Republic of South Africa)";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ id: "ZAF", nameFr: officialName }],
            meta: { total: 1, page: 1, perPage: 20 },
          }),
      });

      const result = await getCountries();

      expect(result.data[0]).toMatchObject({
        id: "ZAF",
        nameFr: officialName,
        nameOfficial: officialName,
        nameCommonFr: "Afrique du Sud",
      });
    });

    // @req REQ-001
    it("sorts all accumulated pages by French common name", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ id: "ZWE", nameFr: "République du Zimbabwe" }],
              meta: { total: 101, page: 1, perPage: 100 },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: "ZAF",
                  nameFr:
                    "République d'Afrique du Sud (Republic of South Africa)",
                },
              ],
              meta: { total: 101, page: 2, perPage: 100 },
            }),
        });

      const result = await getAllCountries();

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "/api/v2/countries?page=1&perPage=100"
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "/api/v2/countries?page=2&perPage=100"
      );
      expect(result.map((country) => country.id)).toEqual(["ZAF", "ZWE"]);
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
      expect(result?.nameOfficial).toBe("Republic of Zimbabwe");
      expect(result?.nameCommonFr).toBe("Zimbabwe");
      expect(result?.etymology).toBe("House of Stone");
      expect(result?.historicalNames?.colonization).toBe("Southern Rhodesia");
      expect(result?.kingdoms).toHaveLength(2);
    });

    // @req REQ-002
    it("preserves the source official name and derives the common name", async () => {
      const officialName =
        "République d'Afrique du Sud (Republic of South Africa)";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: "ZAF",
              nameFr: officialName,
              content: {},
            },
          }),
      });

      const result = await getCountry("ZAF");

      expect(result).toMatchObject({
        id: "ZAF",
        nameFr: officialName,
        nameOfficial: officialName,
        nameCommonFr: "Afrique du Sud",
      });
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

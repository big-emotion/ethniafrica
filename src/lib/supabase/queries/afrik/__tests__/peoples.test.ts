import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  getAllAfrikPeoples,
  getAfrikPeopleById,
  getPaginatedAfrikPeoples,
  getAfrikPeoplesByLanguageFamily,
  getAfrikPeoplesByCountry,
  getAfrikPeoplesByIds,
  searchAfrikPeoples,
  getPeopleCountsByLanguageFamily,
  UNCLASSIFIED_FAMILY_KEY,
} from "../peoples";
import { createServerClient } from "../../../server";

describe("AFRIK Peoples Queries", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  /**
   * Creates a mock that chains from().select().in() for relations,
   * or from().select().eq().order() / .single() for peoples.
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  function setupMock(options: {
    peoplesData?: any[];
    peoplesSingleData?: any;
    relationsData?: any[];
    countryRelationsData?: any[];
    peoplesError?: any;
  }) {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const {
      peoplesData,
      peoplesSingleData,
      relationsData,
      countryRelationsData,
      peoplesError,
    } = options;

    // Track which table is being queried
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "afrik_people_countries") {
        // Relations mock — supports both .eq() and .in()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relChain: any = {
          select: vi.fn(() => relChain),
          eq: vi.fn(() =>
            Promise.resolve({
              data: countryRelationsData || relationsData || [],
              error: null,
            })
          ),
          in: vi.fn(() =>
            Promise.resolve({
              data: relationsData || [],
              error: null,
            })
          ),
        };
        return relChain;
      }

      // Peoples table mock
      return mockSupabase;
    });

    // Chain methods for peoples table
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.in.mockReturnValue(mockSupabase);

    if (peoplesData !== undefined) {
      mockSupabase.order.mockResolvedValue({
        data: peoplesData,
        error: peoplesError || null,
      });
    }

    if (peoplesSingleData !== undefined) {
      mockSupabase.single.mockResolvedValue({
        data: peoplesSingleData,
        error: peoplesError || null,
      });
    }
  }

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      in: vi.fn(() => mockSupabase),
      single: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      range: vi.fn(() => mockSupabase),
      or: vi.fn(() => mockSupabase),
      textSearch: vi.fn(() => mockSupabase),
    };
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  describe("getAllAfrikPeoples", () => {
    // @req REQ-019
    it("should return all peoples with relations", async () => {
      setupMock({
        peoplesData: [
          {
            id: "PPL_SHONA",
            name_main: "Shona",
            language_family_id: "FLG_BANTU",
            content: {},
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        relationsData: [{ people_id: "PPL_SHONA", country_id: "ZWE" }],
      });

      const result = await getAllAfrikPeoples();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("PPL_SHONA");
      expect(result[0].currentCountries).toContain("ZWE");
    });
  });

  describe("getPaginatedAfrikPeoples", () => {
    // @req REQ-033
    it("should fetch a page and its country relations in one database query", async () => {
      const pageRows = [
        {
          id: "PPL_PAGE_21",
          name_main: "Page 21",
          language_family_id: "FLG_TEST",
          content: {},
          afrik_people_countries: [{ country_id: "COD" }],
        },
        {
          id: "PPL_PAGE_22",
          name_main: "Page 22",
          language_family_id: "FLG_TEST",
          content: {},
          afrik_people_countries: [{ country_id: "COG" }],
        },
      ];
      const peopleChain = {
        select: vi.fn(),
        order: vi.fn(),
        range: vi.fn(),
      };
      peopleChain.select.mockReturnValue(peopleChain);
      peopleChain.order.mockReturnValue(peopleChain);
      peopleChain.range.mockResolvedValue({
        data: pageRows,
        error: null,
        count: 42,
      });

      const relationChain = {
        select: vi.fn(),
        in: vi.fn(),
      };
      relationChain.select.mockReturnValue(relationChain);
      relationChain.in.mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) =>
        table === "afrik_people_countries" ? relationChain : peopleChain
      );

      const result = await getPaginatedAfrikPeoples(2, 20);

      expect(peopleChain.select).toHaveBeenCalledWith(
        "*, afrik_people_countries(country_id)",
        { count: "exact" }
      );
      expect(peopleChain.range).toHaveBeenCalledWith(20, 39);
      expect(result.total).toBe(42);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].currentCountries).toEqual(["COD"]);
      expect(result.data[1].currentCountries).toEqual(["COG"]);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith("afrik_peoples");
      expect(relationChain.in).not.toHaveBeenCalled();
    });

    // @req REQ-033
    it("should apply optional filters before database pagination", async () => {
      const peopleChain = {
        select: vi.fn(),
        textSearch: vi.fn(),
        ilike: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        range: vi.fn(),
      };
      peopleChain.select.mockReturnValue(peopleChain);
      peopleChain.textSearch.mockReturnValue(peopleChain);
      peopleChain.ilike.mockReturnValue(peopleChain);
      peopleChain.eq.mockReturnValue(peopleChain);
      peopleChain.order.mockReturnValue(peopleChain);
      peopleChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });
      mockSupabase.from.mockReturnValue(peopleChain);

      await getPaginatedAfrikPeoples(1, 20, {
        search: "Kongo",
        initialLetter: "K",
        languageFamilyId: "FLG_BANTU",
      });

      expect(peopleChain.textSearch).toHaveBeenCalledWith(
        "search_vector",
        "Kongo",
        { type: "websearch", config: "french" }
      );
      expect(peopleChain.ilike).toHaveBeenCalledWith("name_main", "K%");
      expect(peopleChain.eq).toHaveBeenCalledWith(
        "language_family_id",
        "FLG_BANTU"
      );
      expect(peopleChain.range).toHaveBeenCalledWith(0, 19);
    });
  });

  describe("getAfrikPeopleById", () => {
    // @req REQ-019
    it("should return a people by ID", async () => {
      setupMock({
        peoplesSingleData: {
          id: "PPL_SHONA",
          name_main: "Shona",
          language_family_id: "FLG_BANTU",
          content: {},
        },
        relationsData: [{ people_id: "PPL_SHONA", country_id: "ZWE" }],
      });

      const result = await getAfrikPeopleById("PPL_SHONA");

      expect(result).toBeDefined();
      expect(result?.id).toBe("PPL_SHONA");
      expect(result?.currentCountries).toContain("ZWE");
    });

    // @req REQ-019
    it("should return null when not found", async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await getAfrikPeopleById("PPL_NONEXISTENT");

      expect(result).toBeNull();
    });
  });

  describe("getAfrikPeoplesByLanguageFamily", () => {
    // @req REQ-019
    it("should filter peoples by language family", async () => {
      setupMock({
        peoplesData: [
          {
            id: "PPL_SHONA",
            name_main: "Shona",
            language_family_id: "FLG_BANTU",
            content: {},
          },
        ],
        relationsData: [{ people_id: "PPL_SHONA", country_id: "ZWE" }],
      });

      const result = await getAfrikPeoplesByLanguageFamily("FLG_BANTU");

      expect(result).toHaveLength(1);
      expect(result[0].languageFamilyId).toBe("FLG_BANTU");
    });
  });

  describe("getAfrikPeoplesByCountry", () => {
    // @req REQ-019
    it("should filter peoples by country", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "afrik_people_countries") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const relChain: any = {
            select: vi.fn(() => relChain),
            eq: vi.fn(() =>
              Promise.resolve({
                data: [{ people_id: "PPL_SHONA" }],
                error: null,
              })
            ),
            in: vi.fn(() =>
              Promise.resolve({
                data: [{ people_id: "PPL_SHONA", country_id: "ZWE" }],
                error: null,
              })
            ),
          };
          return relChain;
        }

        // Peoples table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pChain: any = {
          select: vi.fn(() => pChain),
          in: vi.fn(() => pChain),
          order: vi.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: "PPL_SHONA",
                  name_main: "Shona",
                  language_family_id: "FLG_BANTU",
                  content: {},
                },
              ],
              error: null,
            })
          ),
        };
        return pChain;
      });

      const result = await getAfrikPeoplesByCountry("ZWE");

      expect(result).toHaveLength(1);
    });
  });

  describe("searchAfrikPeoples", () => {
    // @req REQ-019
    it("should use FTS textSearch on search_vector with french config", async () => {
      // Chain: from().select().textSearch().order()
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "afrik_people_countries") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const relChain: any = {
            select: vi.fn(() => relChain),
            in: vi.fn(() =>
              Promise.resolve({
                data: [{ people_id: "PPL_SHONA", country_id: "ZWE" }],
                error: null,
              })
            ),
          };
          return relChain;
        }
        return mockSupabase;
      });

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.textSearch.mockReturnValue(mockSupabase);
      mockSupabase.order.mockResolvedValue({
        data: [
          {
            id: "PPL_SHONA",
            name_main: "Shona",
            language_family_id: "FLG_BANTU",
            content: {},
          },
        ],
        error: null,
      });

      const result = await searchAfrikPeoples("Shona");

      expect(mockSupabase.textSearch).toHaveBeenCalledWith(
        "search_vector",
        "Shona",
        { type: "websearch", config: "french" }
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("PPL_SHONA");
    });

    // @req REQ-019
    it("should return stemmed matches via french dictionary", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "afrik_people_countries") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const relChain: any = {
            select: vi.fn(() => relChain),
            in: vi.fn(() =>
              Promise.resolve({
                data: [{ people_id: "PPL_KIKONGO", country_id: "COD" }],
                error: null,
              })
            ),
          };
          return relChain;
        }
        return mockSupabase;
      });

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.textSearch.mockReturnValue(mockSupabase);
      mockSupabase.order.mockResolvedValue({
        data: [
          {
            id: "PPL_KIKONGO",
            name_main: "Kikongo",
            language_family_id: "FLG_BANTU",
            content: {},
          },
        ],
        error: null,
      });

      // "kikongos" is the stemmed query; french dict should match "Kikongo"
      const result = await searchAfrikPeoples("kikongos");

      expect(mockSupabase.textSearch).toHaveBeenCalledWith(
        "search_vector",
        "kikongos",
        { type: "websearch", config: "french" }
      );
      expect(result).toHaveLength(1);
      expect(result[0].nameMain).toBe("Kikongo");
    });
  });

  describe("getPeopleCountsByLanguageFamily", () => {
    // @req REQ-108
    it("should group stored peoples rows by language_family_id in a single query", async () => {
      const rows = [
        ...Array.from({ length: 28 }, () => ({
          language_family_id: "FLG_X",
        })),
        { language_family_id: null },
        { language_family_id: null },
      ];
      const chain = { select: vi.fn() };
      chain.select.mockResolvedValue({ data: rows, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getPeopleCountsByLanguageFamily();

      expect(mockSupabase.from).toHaveBeenCalledWith("afrik_peoples");
      expect(chain.select).toHaveBeenCalledWith("language_family_id");
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(result.get("FLG_X")).toBe(28);
      expect(result.get(UNCLASSIFIED_FAMILY_KEY)).toBe(2);
    });

    // @req REQ-108
    it("should throw when the query fails", async () => {
      const chain = { select: vi.fn() };
      chain.select.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });
      mockSupabase.from.mockReturnValue(chain);

      await expect(getPeopleCountsByLanguageFamily()).rejects.toBeTruthy();
    });
  });

  describe("getAfrikPeoplesByIds", () => {
    // @req REQ-116
    it("should return the named peoples with their country relations", async () => {
      setupMock({
        peoplesData: [
          {
            id: "PPL_SOMALI",
            name_main: "Somali",
            language_family_id: "FLG_COUCHITIQUE",
            content: {},
          },
          {
            id: "PPL_TUAREG",
            name_main: "Touaregs",
            language_family_id: "FLG_BERBERE",
            content: {},
          },
        ],
        relationsData: [
          { people_id: "PPL_SOMALI", country_id: "SOM" },
          { people_id: "PPL_TUAREG", country_id: "NER" },
        ],
      });

      const result = await getAfrikPeoplesByIds(["PPL_SOMALI", "PPL_TUAREG"]);

      expect(mockSupabase.in).toHaveBeenCalledWith("id", [
        "PPL_SOMALI",
        "PPL_TUAREG",
      ]);
      expect(result.map((people) => people.id)).toEqual([
        "PPL_SOMALI",
        "PPL_TUAREG",
      ]);
      expect(result[0].currentCountries).toContain("SOM");
      expect(result[1].currentCountries).toContain("NER");
    });

    /**
     * A family whose fiche names no identified people reaches here with an
     * empty list. PostgREST answers `in.()` with a syntax error, so the guard
     * is what keeps an ordinary editorial gap from reading as an outage.
     */
    // @req REQ-116
    it("should answer an empty list without touching the database", async () => {
      const result = await getAfrikPeoplesByIds([]);

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });
});

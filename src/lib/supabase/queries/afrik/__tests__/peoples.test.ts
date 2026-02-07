import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  getAllAfrikPeoples,
  getAfrikPeopleById,
  getAfrikPeoplesByLanguageFamily,
  getAfrikPeoplesByCountry,
  searchAfrikPeoples,
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
    };
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  describe("getAllAfrikPeoples", () => {
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

  describe("getAfrikPeopleById", () => {
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
    it("should filter peoples by country", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "afrik_people_countries") {
          callCount++;
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
    it("should search peoples by name", async () => {
      // For search, the chain is from().select().or().order()
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
      mockSupabase.or.mockReturnValue(mockSupabase);
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

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("PPL_SHONA");
    });
  });
});

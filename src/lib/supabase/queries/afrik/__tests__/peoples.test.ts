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
  let mockSupabase: any;

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
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  describe("getAllAfrikPeoples", () => {
    it("should return all peoples with relations", async () => {
      const mockData = [
        {
          id: "PPL_SHONA",
          name_main: "Shona",
          language_family_id: "FLG_BANTU",
          content: {},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });
      mockSupabase.eq.mockResolvedValue({
        data: [{ country_id: "ZWE" }],
        error: null,
      });

      const result = await getAllAfrikPeoples();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("PPL_SHONA");
      expect(result[0].currentCountries).toContain("ZWE");
    });
  });

  describe("getAfrikPeopleById", () => {
    it("should return a people by ID", async () => {
      const mockData = {
        id: "PPL_SHONA",
        name_main: "Shona",
        language_family_id: "FLG_BANTU",
        content: {},
      };

      // Mock the chain: from().select().eq().single()
      let chainCount = 0;
      mockSupabase.single = vi.fn(() => {
        chainCount++;
        if (chainCount === 1) {
          return Promise.resolve({ data: mockData, error: null });
        }
        return mockSupabase;
      });

      // Mock relations query
      const relationsMock = {
        from: vi.fn(() => relationsMock),
        select: vi.fn(() => relationsMock),
        eq: vi.fn(() =>
          Promise.resolve({ data: [{ country_id: "ZWE" }], error: null })
        ),
      };
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "afrik_people_countries") {
          return relationsMock;
        }
        return mockSupabase;
      });

      const result = await getAfrikPeopleById("PPL_SHONA");

      expect(result).toBeDefined();
      expect(result?.id).toBe("PPL_SHONA");
    });
  });

  describe("getAfrikPeoplesByLanguageFamily", () => {
    it("should filter peoples by language family", async () => {
      const mockData = [
        {
          id: "PPL_SHONA",
          name_main: "Shona",
          language_family_id: "FLG_BANTU",
          content: {},
        },
      ];

      // Mock the chain: from().select().eq().order()
      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      // Mock relations query
      const relationsMock = {
        from: vi.fn(() => relationsMock),
        select: vi.fn(() => relationsMock),
        eq: vi.fn(() =>
          Promise.resolve({ data: [{ country_id: "ZWE" }], error: null })
        ),
      };
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "afrik_people_countries") {
          return relationsMock;
        }
        return mockSupabase;
      });

      const result = await getAfrikPeoplesByLanguageFamily("FLG_BANTU");

      expect(result).toHaveLength(1);
      expect(result[0].languageFamilyId).toBe("FLG_BANTU");
    });
  });

  describe("getAfrikPeoplesByCountry", () => {
    it("should filter peoples by country", async () => {
      // Mock relations query first
      const relationsMock1 = {
        from: vi.fn(() => relationsMock1),
        select: vi.fn(() => relationsMock1),
        eq: vi.fn(() =>
          Promise.resolve({ data: [{ people_id: "PPL_SHONA" }], error: null })
        ),
      };

      // Mock peoples query
      const peoplesMock = {
        from: vi.fn(() => peoplesMock),
        select: vi.fn(() => peoplesMock),
        in: vi.fn(() => peoplesMock),
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

      // Mock relations query for currentCountries
      const relationsMock2 = {
        from: vi.fn(() => relationsMock2),
        select: vi.fn(() => relationsMock2),
        eq: vi.fn(() =>
          Promise.resolve({ data: [{ country_id: "ZWE" }], error: null })
        ),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "afrik_people_countries") {
          callCount++;
          return callCount === 1 ? relationsMock1 : relationsMock2;
        }
        if (table === "afrik_peoples") {
          return peoplesMock;
        }
        return mockSupabase;
      });

      const result = await getAfrikPeoplesByCountry("ZWE");

      expect(result).toHaveLength(1);
    });
  });
});

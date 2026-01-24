import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  getAllAfrikCountries,
  getAfrikCountryById,
  searchAfrikCountries,
} from "../countries";
import { createServerClient } from "../../../server";

describe("AFRIK Countries Queries", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      single: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      range: vi.fn(() => mockSupabase),
      or: vi.fn(() => mockSupabase),
    };
    vi.clearAllMocks();
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  describe("getAllAfrikCountries", () => {
    it("should return all countries", async () => {
      const mockData = [
        {
          id: "ZWE",
          name_fr: "Zimbabwe",
          etymology: null,
          name_origin_actor: null,
          content: {},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getAllAfrikCountries();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ZWE");
      expect(result[0].nameFr).toBe("Zimbabwe");
    });

    it("should support pagination", async () => {
      mockSupabase.range.mockResolvedValue({ data: [], error: null });

      await getAllAfrikCountries(1, 10);

      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9);
    });
  });

  describe("getAfrikCountryById", () => {
    it("should return a country by ISO code", async () => {
      const mockData = {
        id: "ZWE",
        name_fr: "Zimbabwe",
        content: {},
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await getAfrikCountryById("ZWE");

      expect(result).toBeDefined();
      expect(result?.id).toBe("ZWE");
    });

    it("should return null if not found", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await getAfrikCountryById("XXX");

      expect(result).toBeNull();
    });
  });

  describe("searchAfrikCountries", () => {
    it("should search countries by query", async () => {
      const mockData = [
        {
          id: "ZWE",
          name_fr: "Zimbabwe",
          content: {},
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await searchAfrikCountries("Zimbabwe");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ZWE");
    });
  });
});

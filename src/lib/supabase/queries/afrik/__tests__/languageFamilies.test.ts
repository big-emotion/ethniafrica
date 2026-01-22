import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
  searchAfrikLanguageFamilies,
} from "../languageFamilies";
import { createServerClient } from "../../../server";

describe("AFRIK Language Families Queries", () => {
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

  describe("getAllAfrikLanguageFamilies", () => {
    it("should return all language families", async () => {
      const mockData = [
        {
          id: "FLG_BANTU",
          name_fr: "Bantou",
          name_en: "Bantu",
          content: {},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getAllAfrikLanguageFamilies();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("FLG_BANTU");
      expect(result[0].nameFr).toBe("Bantou");
    });
  });

  describe("getAfrikLanguageFamilyById", () => {
    it("should return a language family by ID", async () => {
      const mockData = {
        id: "FLG_BANTU",
        name_fr: "Bantou",
        name_en: "Bantu",
        content: {},
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await getAfrikLanguageFamilyById("FLG_BANTU");

      expect(result).toBeDefined();
      expect(result?.id).toBe("FLG_BANTU");
    });

    it("should return null if not found", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await getAfrikLanguageFamilyById("FLG_NONEXISTENT");

      expect(result).toBeNull();
    });
  });

  describe("searchAfrikLanguageFamilies", () => {
    it("should search language families by query", async () => {
      const mockData = [
        {
          id: "FLG_BANTU",
          name_fr: "Bantou",
          name_en: "Bantu",
          content: {},
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await searchAfrikLanguageFamilies("Bantu");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("FLG_BANTU");
    });
  });
});

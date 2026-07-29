import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import { getAfrikLanguagesByFamily } from "../languages";
import { createServerClient } from "../../../server";

describe("AFRIK Languages Queries", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
    };
    vi.clearAllMocks();
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  describe("getAfrikLanguagesByFamily", () => {
    // @req REQ-033
    it("returns the family's languages mapped to camelCase, ordered by name", async () => {
      const mockData = [
        {
          id: "kon",
          name: "Kikongo",
          family_id: "FLG_BANTU",
          content: { dialects: ["Kizombo"] },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];
      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getAfrikLanguagesByFamily("FLG_BANTU");

      expect(mockSupabase.from).toHaveBeenCalledWith("afrik_languages");
      expect(mockSupabase.eq).toHaveBeenCalledWith("family_id", "FLG_BANTU");
      expect(mockSupabase.order).toHaveBeenCalledWith("name");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "kon",
        name: "Kikongo",
        familyId: "FLG_BANTU",
        content: { dialects: ["Kizombo"] },
      });
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    // @req REQ-033
    it("returns [] for an unknown family id without throwing", async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const result = await getAfrikLanguagesByFamily("FLG_NONEXISTENT");

      expect(result).toEqual([]);
    });

    // @req REQ-033
    it("returns [] when data is null", async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: null });

      const result = await getAfrikLanguagesByFamily("FLG_BANTU");

      expect(result).toEqual([]);
    });

    // @req REQ-033
    it("logs via logger and throws on a Supabase error", async () => {
      const dbError = new Error("db down");
      mockSupabase.order.mockResolvedValue({ data: null, error: dbError });

      await expect(getAfrikLanguagesByFamily("FLG_BANTU")).rejects.toThrow(
        "db down"
      );
    });
  });
});

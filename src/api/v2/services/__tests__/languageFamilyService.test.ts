import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "../languageFamilyService";

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAllAfrikLanguageFamilies: vi.fn(),
  getAfrikLanguageFamilyById: vi.fn(),
}));

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
} from "@/lib/supabase/queries/afrik/languageFamilies";

// Mock global fetch
global.fetch = vi.fn();

/**
 * TDD Phase: RED
 * Test: Language Family Service - business logic for language families
 */
describe("Language Family Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockClear();
  });

  describe("getLanguageFamilies", () => {
    it("should return paginated language families", async () => {
      const mockFamilies = Array.from({ length: 10 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));

      // Mock fetch response for internal route
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamilies,
      });

      const result = await getLanguageFamilies(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);

      // Verify fetch was called with correct URL and tags
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/internal/language-families"),
        expect.objectContaining({
          next: expect.objectContaining({
            tags: ["afrik-language-families"],
            revalidate: 3600,
          }),
        })
      );
    });

    it("should handle pagination correctly", async () => {
      const mockFamilies = Array.from({ length: 10 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));

      // Mock fetch response for internal route
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockFamilies,
      });

      const page1 = await getLanguageFamilies(1, 2);
      const page2 = await getLanguageFamilies(2, 2);

      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
    });

    it("should fallback to direct query if fetch fails", async () => {
      const mockFamilies = Array.from({ length: 10 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));

      // Mock fetch to fail
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));
      (getAllAfrikLanguageFamilies as any).mockResolvedValue(mockFamilies);

      const result = await getLanguageFamilies(1, 5);

      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
      // Verify fallback was used
      expect(getAllAfrikLanguageFamilies).toHaveBeenCalled();
    });
  });

  describe("getLanguageFamilyById", () => {
    it("should return a language family by FLG_ ID", async () => {
      const mockFamily = {
        id: "FLG_BANTU",
        nameFr: "Bantou",
        nameEn: "Bantu",
        content: {},
      };

      (getAfrikLanguageFamilyById as any).mockResolvedValue(mockFamily);

      const family = await getLanguageFamilyById("FLG_BANTU");

      expect(family).toBeDefined();
      expect(family?.id).toBe("FLG_BANTU");
      expect(family?.nameFr).toBe("Bantou");
    });

    it("should return null for non-existent language family", async () => {
      (getAfrikLanguageFamilyById as any).mockResolvedValue(null);

      const family = await getLanguageFamilyById("FLG_NONEXISTENT");

      expect(family).toBeNull();
    });
  });
});

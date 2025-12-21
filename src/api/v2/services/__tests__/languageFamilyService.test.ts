import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "../languageFamilyService";

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAllAfrikLanguageFamilies: vi.fn(),
  getAfrikLanguageFamilyById: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
} from "@/lib/supabase/queries/afrik/languageFamilies";

/**
 * TDD Phase: RED
 * Test: Language Family Service - business logic for language families
 */
describe("Language Family Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLanguageFamilies", () => {
    it("should return paginated language families", async () => {
      const mockFamilies = Array.from({ length: 10 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));

      (getAllAfrikLanguageFamilies as any).mockResolvedValue(mockFamilies);

      const result = await getLanguageFamilies(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
    });

    it("should handle pagination correctly", async () => {
      const mockFamilies = Array.from({ length: 10 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));

      (getAllAfrikLanguageFamilies as any).mockResolvedValue(mockFamilies);

      const page1 = await getLanguageFamilies(1, 2);
      const page2 = await getLanguageFamilies(2, 2);

      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
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

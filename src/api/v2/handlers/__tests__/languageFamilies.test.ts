import { describe, it, expect, beforeEach } from "vitest";
import {
  listLanguageFamiliesHandler,
  getLanguageFamilyHandler,
} from "../languageFamilies";
import { clearLanguageFamilyCache } from "@/lib/afrik/loaders/languageFamilyLoader";

/**
 * TDD Phase: RED
 * Test: Language Families Handler - API handlers for language families
 */
describe("Language Families Handler", () => {
  beforeEach(() => {
    clearLanguageFamilyCache();
  });

  describe("listLanguageFamiliesHandler", () => {
    it("should return paginated language families with metadata", async () => {
      const response = await listLanguageFamiliesHandler(1, 5);

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.meta).toBeDefined();
      expect(response.meta?.total).toBeGreaterThan(0);
    });
  });

  describe("getLanguageFamilyHandler", () => {
    it("should return a language family by FLG_ ID", async () => {
      const family = await getLanguageFamilyHandler("FLG_BANTU");

      expect(family).toBeDefined();
      expect(family?.id).toBe("FLG_BANTU");
    });

    it("should return null for non-existent language family", async () => {
      const family = await getLanguageFamilyHandler("FLG_NONEXISTENT");

      expect(family).toBeNull();
    });
  });
});

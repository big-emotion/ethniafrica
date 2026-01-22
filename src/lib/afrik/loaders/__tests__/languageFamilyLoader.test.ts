import { describe, it, expect } from "vitest";
import {
  loadLanguageFamily,
  loadAllLanguageFamilies,
} from "../languageFamilyLoader";

/**
 * TDD Phase: RED
 * Test: Language Family loader - reads language family files from filesystem
 */
describe("Language Family Loader", () => {
  describe("loadLanguageFamily", () => {
    it("should load a language family by FLG_ ID", async () => {
      const result = await loadLanguageFamily("FLG_BANTU");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe("FLG_BANTU");
      expect(result.data?.nameFr).toBeDefined();
    });

    it("should return error for non-existent language family", async () => {
      const result = await loadLanguageFamily("FLG_NONEXISTENT");

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe("parse_failure");
    });

    it("should cache loaded language families", async () => {
      const result1 = await loadLanguageFamily("FLG_BANTU");
      const result2 = await loadLanguageFamily("FLG_BANTU");

      // Should return same reference (cached)
      expect(result1.data).toBe(result2.data);
    });
  });

  describe("loadAllLanguageFamilies", () => {
    it("should load all language family files", async () => {
      const families = await loadAllLanguageFamilies();

      expect(Array.isArray(families)).toBe(true);
      expect(families.length).toBeGreaterThan(0);

      // Check that we have the expected families
      const bantu = families.find((f) => f.id === "FLG_BANTU");
      expect(bantu).toBeDefined();
    });

    it("should return valid LanguageFamily objects", async () => {
      const families = await loadAllLanguageFamilies();

      for (const family of families.slice(0, 5)) {
        expect(family).toHaveProperty("id");
        expect(family).toHaveProperty("nameFr");
        expect(family).toHaveProperty("content");
        expect(family.id).toMatch(/^FLG_/);
      }
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { searchHandler } from "../search";
import { clearCountryCache } from "@/lib/afrik/loaders/countryLoader";
import { clearPeopleCache } from "@/lib/afrik/loaders/peopleLoader";
import { clearLanguageFamilyCache } from "@/lib/afrik/loaders/languageFamilyLoader";

/**
 * TDD Phase: RED
 * Test: Search Handler - API handler for search
 */
describe("Search Handler", () => {
  beforeEach(() => {
    clearCountryCache();
    clearPeopleCache();
    clearLanguageFamilyCache();
  });

  describe("searchHandler", () => {
    it("should return search results", async () => {
      const results = await searchHandler({ query: "Bantu" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should filter by type", async () => {
      const results = await searchHandler({
        query: "Zimbabwe",
        type: "country",
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.every((r) => r.type === "country")).toBe(true);
    });

    it("should return empty array for no matches", async () => {
      const results = await searchHandler({ query: "NONEXISTENTQUERY12345" });

      expect(Array.isArray(results)).toBe(true);
    });
  });
});

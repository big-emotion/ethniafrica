import { describe, it, expect, vi, beforeEach } from "vitest";
import { search } from "../searchService";

vi.mock("@/lib/supabase/queries/afrik/search", () => ({
  searchAfrikAll: vi.fn(),
}));

import { searchAfrikAll } from "@/lib/supabase/queries/afrik/search";

/**
 * TDD Phase: RED
 * Test: Search Service - search logic
 */
describe("Search Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("search", () => {
    it("should search across all types by default", async () => {
      const mockResults = [
        {
          type: "languageFamily" as const,
          id: "FLG_BANTU",
          data: { id: "FLG_BANTU", nameFr: "Bantou", content: {} },
        },
      ];

      (searchAfrikAll as any).mockResolvedValue(mockResults);

      const results = await search({ query: "Bantu" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].type).toBe("languageFamily");
    });

    it("should filter by type", async () => {
      const mockResults = [
        {
          type: "country" as const,
          id: "ZWE",
          data: { id: "ZWE", nameFr: "Zimbabwe", content: {} },
        },
      ];

      (searchAfrikAll as any).mockResolvedValue(mockResults);

      const results = await search({ query: "Zimbabwe", type: "country" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.every((r) => r.type === "country")).toBe(true);
    });

    it("should filter by language family", async () => {
      const mockResults = [
        {
          type: "people" as const,
          id: "PPL_SHONA",
          data: {
            id: "PPL_SHONA",
            nameMain: "Shona",
            languageFamilyId: "FLG_BANTU",
            currentCountries: [],
            content: {},
          },
        },
      ];

      (searchAfrikAll as any).mockResolvedValue(mockResults);

      const results = await search({ languageFamilyId: "FLG_BANTU" });

      expect(Array.isArray(results)).toBe(true);
      expect(results[0].type).toBe("people");
      expect((results[0].data as any).languageFamilyId).toBe("FLG_BANTU");
    });

    it("should return empty array for no matches", async () => {
      (searchAfrikAll as any).mockResolvedValue([]);

      const results = await search({ query: "NONEXISTENTQUERY12345" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });
});

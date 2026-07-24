import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/searchService", () => ({
  search: vi.fn(),
  ftsSearch: vi.fn(),
}));

import { search } from "../../services/searchService";
import { searchHandler } from "../search";

const BANTU_FAMILY = {
  type: "languageFamily" as const,
  id: "FLG_BANTU",
  name: "Bantou",
};
const ZIMBABWE = { type: "country" as const, id: "ZWE", name: "Zimbabwe" };

describe("Search Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchHandler", () => {
    it("should return search results", async () => {
      vi.mocked(search).mockResolvedValue([BANTU_FAMILY]);

      const results = await searchHandler({ query: "Bantu" });

      expect(search).toHaveBeenCalledWith({ query: "Bantu" });
      expect(results).toEqual([BANTU_FAMILY]);
    });

    it("should filter by type", async () => {
      vi.mocked(search).mockResolvedValue([ZIMBABWE]);

      const results = await searchHandler({
        query: "Zimbabwe",
        type: "country",
      });

      expect(search).toHaveBeenCalledWith({
        query: "Zimbabwe",
        type: "country",
      });
      expect(results.every((r) => r.type === "country")).toBe(true);
    });

    it("should return empty array for no matches", async () => {
      vi.mocked(search).mockResolvedValue([]);

      const results = await searchHandler({ query: "NONEXISTENTQUERY12345" });

      expect(results).toEqual([]);
    });

    it("should default to empty filters when called with no arguments", async () => {
      vi.mocked(search).mockResolvedValue([]);

      const results = await searchHandler();

      expect(search).toHaveBeenCalledWith({});
      expect(results).toEqual([]);
    });
  });
});

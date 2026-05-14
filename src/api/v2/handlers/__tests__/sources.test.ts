import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/sources", () => ({
  listSources: vi.fn(),
  getSourceById: vi.fn(),
}));

import { listSources, getSourceById } from "../../services/sources";
import { listSourcesHandler, getSourceHandler } from "../sources";

describe("sources handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listSourcesHandler", () => {
    it("returns the canonical envelope with pagination meta", async () => {
      const source = {
        id: "11111111-1111-1111-1111-111111111111",
        title: "World Bank Open Data",
        url: "https://data.worldbank.org",
        type: "tertiary" as const,
        pinnedUrl: null,
        year: 2024,
        author: null,
        publisher: "World Bank",
        resolvable: true,
        lastVerifiedAt: "2026-01-01T00:00:00.000Z",
      };
      vi.mocked(listSources).mockResolvedValue({ data: [source], total: 1 });

      const result = await listSourcesHandler({ page: 1, perPage: 20 });

      expect(listSources).toHaveBeenCalledWith({ page: 1, perPage: 20 });
      expect(result).toEqual({
        data: [source],
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: "Africa History — africahistory.org",
          pagination: { total: 1, page: 1, perPage: 20, totalPages: 1 },
        },
        errors: [],
      });
    });
  });

  describe("getSourceHandler", () => {
    it("returns the envelope around a single source", async () => {
      const source = {
        id: "11111111-1111-1111-1111-111111111111",
        title: "UN Pop",
        url: null,
        type: "primary" as const,
        pinnedUrl: null,
        year: 2025,
        author: null,
        publisher: "UN DESA",
        resolvable: null,
        lastVerifiedAt: null,
      };
      vi.mocked(getSourceById).mockResolvedValue(source);

      const result = await getSourceHandler(source.id);

      expect(result).toEqual({
        data: source,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: "Africa History — africahistory.org",
        },
        errors: [],
      });
    });

    it("returns null when the source is not found (route turns this into 404)", async () => {
      vi.mocked(getSourceById).mockResolvedValue(null);

      const result = await getSourceHandler(
        "00000000-0000-0000-0000-000000000000"
      );

      expect(result).toBeNull();
    });
  });
});

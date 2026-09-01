import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/languageFamilyService", () => ({
  getLanguageFamilies: vi.fn(),
  getLanguageFamilyById: vi.fn(),
}));

import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "../../services/languageFamilyService";
import {
  listLanguageFamiliesHandler,
  getLanguageFamilyHandler,
} from "../languageFamilies";
import { API_ATTRIBUTION } from "@/api/v2/utils/response";
import type { LanguageFamily } from "@/types/afrik";

const BANTU = {
  id: "FLG_BANTU",
  nameFr: "Bantou",
  content: {},
} satisfies LanguageFamily;

describe("Language Families Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listLanguageFamiliesHandler", () => {
    // @req REQ-084
    it("returns language families in the licensed paginated envelope", async () => {
      vi.mocked(getLanguageFamilies).mockResolvedValue({
        data: [BANTU],
        total: 12,
        unclassifiedPeoplesCount: 64,
      });

      const response = await listLanguageFamiliesHandler(1, 5);

      expect(getLanguageFamilies).toHaveBeenCalledWith(1, 5);
      expect(response).toEqual({
        data: [BANTU],
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
          pagination: {
            total: 12,
            page: 1,
            perPage: 5,
            totalPages: 3,
            unclassifiedPeoplesCount: 64,
          },
        },
        errors: [],
      });
    });

    it("should handle default pagination", async () => {
      vi.mocked(getLanguageFamilies).mockResolvedValue({
        data: [],
        total: 0,
        unclassifiedPeoplesCount: 0,
      });

      const response = await listLanguageFamiliesHandler();

      expect(getLanguageFamilies).toHaveBeenCalledWith(undefined, undefined);
      expect(response.data).toEqual([]);
      expect(response.meta.pagination?.page).toBe(1);
      expect(response.meta.pagination?.perPage).toBe(20);
    });
  });

  describe("getLanguageFamilyHandler", () => {
    // @req REQ-084
    it("returns a language family by FLG_ ID in the licensed envelope", async () => {
      vi.mocked(getLanguageFamilyById).mockResolvedValue(BANTU);

      const response = await getLanguageFamilyHandler("FLG_BANTU");

      expect(getLanguageFamilyById).toHaveBeenCalledWith("FLG_BANTU");
      expect(response).toEqual({
        data: BANTU,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [],
      });
    });

    it("should return null for non-existent language family", async () => {
      vi.mocked(getLanguageFamilyById).mockResolvedValue(null);

      const family = await getLanguageFamilyHandler("FLG_NONEXISTENT");

      expect(family).toBeNull();
    });
  });
});

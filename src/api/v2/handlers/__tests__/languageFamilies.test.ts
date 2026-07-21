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

const BANTU = { id: "FLG_BANTU", name: "Bantou" } as any;

describe("Language Families Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listLanguageFamiliesHandler", () => {
    it("should return paginated language families with metadata", async () => {
      vi.mocked(getLanguageFamilies).mockResolvedValue({
        data: [BANTU],
        total: 12,
      });

      const response = await listLanguageFamiliesHandler(1, 5);

      expect(getLanguageFamilies).toHaveBeenCalledWith(1, 5);
      expect(response.data).toEqual([BANTU]);
      expect(response.meta).toEqual({
        total: 12,
        page: 1,
        perPage: 5,
        totalPages: 3,
      });
    });

    it("should handle default pagination", async () => {
      vi.mocked(getLanguageFamilies).mockResolvedValue({ data: [], total: 0 });

      const response = await listLanguageFamiliesHandler();

      expect(getLanguageFamilies).toHaveBeenCalledWith(undefined, undefined);
      expect(response.data).toEqual([]);
      expect(response.meta?.page).toBe(1);
      expect(response.meta?.perPage).toBe(20);
    });
  });

  describe("getLanguageFamilyHandler", () => {
    it("should return a language family by FLG_ ID", async () => {
      vi.mocked(getLanguageFamilyById).mockResolvedValue(BANTU);

      const family = await getLanguageFamilyHandler("FLG_BANTU");

      expect(getLanguageFamilyById).toHaveBeenCalledWith("FLG_BANTU");
      expect(family?.id).toBe("FLG_BANTU");
    });

    it("should return null for non-existent language family", async () => {
      vi.mocked(getLanguageFamilyById).mockResolvedValue(null);

      const family = await getLanguageFamilyHandler("FLG_NONEXISTENT");

      expect(family).toBeNull();
    });
  });
});

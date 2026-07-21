import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/peopleService", () => ({
  getPeoples: vi.fn(),
  getPeopleById: vi.fn(),
}));

import { getPeoples, getPeopleById } from "../../services/peopleService";
import { listPeoplesHandler, getPeopleHandler } from "../peoples";

const SHONA = { id: "PPL_SHONA", name: "Shona" } as any;

describe("Peoples Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPeoplesHandler", () => {
    it("should return paginated peoples with metadata", async () => {
      vi.mocked(getPeoples).mockResolvedValue({ data: [SHONA], total: 924 });

      const response = await listPeoplesHandler(1, 5);

      expect(getPeoples).toHaveBeenCalledWith(1, 5);
      expect(response.data).toEqual([SHONA]);
      expect(response.meta).toEqual({
        total: 924,
        page: 1,
        perPage: 5,
        totalPages: 185,
      });
    });

    it("should handle default pagination", async () => {
      vi.mocked(getPeoples).mockResolvedValue({ data: [], total: 0 });

      const response = await listPeoplesHandler();

      expect(getPeoples).toHaveBeenCalledWith(undefined, undefined);
      expect(response.data).toEqual([]);
      expect(response.meta?.page).toBe(1);
      expect(response.meta?.perPage).toBe(20);
    });
  });

  describe("getPeopleHandler", () => {
    it("should return a people by PPL_ ID", async () => {
      vi.mocked(getPeopleById).mockResolvedValue(SHONA);

      const people = await getPeopleHandler("PPL_SHONA");

      expect(getPeopleById).toHaveBeenCalledWith("PPL_SHONA");
      expect(people?.id).toBe("PPL_SHONA");
    });

    it("should return null for non-existent people", async () => {
      vi.mocked(getPeopleById).mockResolvedValue(null);

      const people = await getPeopleHandler("PPL_NONEXISTENT");

      expect(people).toBeNull();
    });
  });
});

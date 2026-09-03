import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/peopleService", () => ({
  getPeoples: vi.fn(),
  getPeopleById: vi.fn(),
}));

vi.mock("../../services/patronymeFicheLinks", () => ({
  getPatronymesBorneByPeople: vi.fn(),
}));

import { getPeoples, getPeopleById } from "../../services/peopleService";
import { getPatronymesBorneByPeople } from "../../services/patronymeFicheLinks";
import { listPeoplesHandler, getPeopleHandler } from "../peoples";
import { API_ATTRIBUTION } from "../../utils/response";
import type { People } from "@/types/afrik";

const SHONA: People = {
  id: "PPL_SHONA",
  nameMain: "Shona",
  languageFamilyId: "FLG_BANTU",
  currentCountries: ["ZWE"],
  content: {},
};

describe("Peoples Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPatronymesBorneByPeople).mockResolvedValue([]);
  });

  describe("listPeoplesHandler", () => {
    // @req REQ-033
    // @req REQ-084
    it("should forward filters and build metadata from the exact total", async () => {
      vi.mocked(getPeoples).mockResolvedValue({ data: [SHONA], total: 924 });

      const filters = {
        search: "shona",
        initialLetter: "S",
        languageFamilyId: "FLG_BANTU",
      };
      const response = await listPeoplesHandler(2, 5, filters);

      expect(getPeoples).toHaveBeenCalledWith(2, 5, filters);
      expect(response).toEqual({
        data: [SHONA],
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
          pagination: {
            total: 924,
            page: 2,
            perPage: 5,
            totalPages: 185,
          },
        },
        errors: [],
      });
    });

    // @req REQ-084
    it("should handle default pagination", async () => {
      vi.mocked(getPeoples).mockResolvedValue({ data: [], total: 0 });

      const response = await listPeoplesHandler();

      expect(getPeoples).toHaveBeenCalledWith(undefined, undefined, {});
      expect(response.data).toEqual([]);
      expect(response.meta.pagination?.page).toBe(1);
      expect(response.meta.pagination?.perPage).toBe(20);
      expect(response.errors).toEqual([]);
    });
  });

  describe("getPeopleHandler", () => {
    // @req REQ-084
    it("should return a people by PPL_ ID", async () => {
      vi.mocked(getPeopleById).mockResolvedValue(SHONA);

      const response = await getPeopleHandler("PPL_SHONA");

      expect(getPeopleById).toHaveBeenCalledWith("PPL_SHONA");
      expect(response).toEqual({
        data: { ...SHONA, patronymes: [] },
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [],
      });
    });

    // @req REQ-084
    it("should return null for non-existent people", async () => {
      vi.mocked(getPeopleById).mockResolvedValue(null);

      const people = await getPeopleHandler("PPL_NONEXISTENT");

      expect(people).toBeNull();
    });

    // @req REQ-133
    it("carries the names the corpus attaches to the people", async () => {
      vi.mocked(getPeopleById).mockResolvedValue(SHONA);
      vi.mocked(getPatronymesBorneByPeople).mockResolvedValue([
        { id: "PAT_MOYO", nameMain: "Moyo", nameSystem: "totemic_clan" },
      ]);

      const response = await getPeopleHandler("PPL_SHONA");

      expect(getPatronymesBorneByPeople).toHaveBeenCalledWith("PPL_SHONA");
      expect(response?.data.patronymes).toEqual([
        { id: "PAT_MOYO", nameMain: "Moyo", nameSystem: "totemic_clan" },
      ]);
    });

    // @req REQ-133
    it("serves an empty list rather than omitting the key", async () => {
      vi.mocked(getPeopleById).mockResolvedValue(SHONA);

      const response = await getPeopleHandler("PPL_SHONA");

      // A missing key and an empty array read the same to a careless client,
      // and only one of them is what the corpus says: 13 peoples out of some
      // 800 carry a name, so "none yet" is the answer, not an omission.
      expect(response?.data.patronymes).toEqual([]);
    });

    // @req REQ-133
    it("does not read names for a people that has no fiche", async () => {
      vi.mocked(getPeopleById).mockResolvedValue(null);

      await getPeopleHandler("PPL_NONEXISTENT");

      expect(getPatronymesBorneByPeople).not.toHaveBeenCalled();
    });
  });
});

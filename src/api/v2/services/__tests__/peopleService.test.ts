import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPeoples,
  getPeopleById,
  getPeoplesByLanguageFamily,
} from "../peopleService";

vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getPaginatedAfrikPeoples: vi.fn(),
  getAfrikPeopleById: vi.fn(),
  getAfrikPeoplesByLanguageFamily: vi.fn(),
}));

import {
  getPaginatedAfrikPeoples,
  getAfrikPeopleById,
  getAfrikPeoplesByLanguageFamily,
} from "@/lib/supabase/queries/afrik/peoples";

describe("People Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPeoples", () => {
    // @req REQ-033
    it("should delegate pagination and filters to the database query", async () => {
      const mockPeoples = [
        {
          id: "PPL_SHONA",
          nameMain: "Shona",
          languageFamilyId: "FLG_BANTU",
          currentCountries: ["ZWE"],
          content: {},
        },
      ];
      vi.mocked(getPaginatedAfrikPeoples).mockResolvedValue({
        data: mockPeoples,
        total: 924,
      });

      const filters = {
        search: "shona",
        initialLetter: "S",
        languageFamilyId: "FLG_BANTU",
      };
      const result = await getPeoples(3, 25, filters);

      expect(getPaginatedAfrikPeoples).toHaveBeenCalledTimes(1);
      expect(getPaginatedAfrikPeoples).toHaveBeenCalledWith(3, 25, filters);
      expect(result).toEqual({ data: mockPeoples, total: 924 });
    });
  });

  describe("getPeopleById", () => {
    it("should return a people by PPL_ ID", async () => {
      const mockPeople = {
        id: "PPL_SHONA",
        nameMain: "Shona",
        languageFamilyId: "FLG_BANTU",
        currentCountries: ["ZWE"],
        content: {},
      };

      vi.mocked(getAfrikPeopleById).mockResolvedValue(mockPeople);

      const people = await getPeopleById("PPL_SHONA");

      expect(people).toBeDefined();
      expect(people?.id).toBe("PPL_SHONA");
      expect(people?.nameMain).toBe("Shona");
    });

    it("should return null for non-existent people", async () => {
      vi.mocked(getAfrikPeopleById).mockResolvedValue(null);

      const people = await getPeopleById("PPL_NONEXISTENT");

      expect(people).toBeNull();
    });
  });

  describe("getPeoplesByLanguageFamily", () => {
    it("should return peoples by language family", async () => {
      const mockPeoples = [
        {
          id: "PPL_SHONA",
          nameMain: "Shona",
          languageFamilyId: "FLG_BANTU",
          currentCountries: ["ZWE"],
          content: {},
        },
      ];

      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

      const peoples = await getPeoplesByLanguageFamily("FLG_BANTU");

      expect(Array.isArray(peoples)).toBe(true);
      expect(peoples.length).toBe(1);
      expect(peoples[0].languageFamilyId).toBe("FLG_BANTU");
    });
  });
});

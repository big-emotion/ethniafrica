import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPeoples,
  getPeopleById,
  getPeoplesByLanguageFamily,
} from "../peopleService";

vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAllAfrikPeoples: vi.fn(),
  getAfrikPeopleById: vi.fn(),
  getAfrikPeoplesByLanguageFamily: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

import {
  getAllAfrikPeoples,
  getAfrikPeopleById,
  getAfrikPeoplesByLanguageFamily,
} from "@/lib/supabase/queries/afrik/peoples";

/**
 * TDD Phase: RED
 * Test: People Service - business logic for peoples
 */
describe("People Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPeoples", () => {
    it("should return paginated peoples", async () => {
      const mockPeoples = Array.from({ length: 10 }, (_, i) => ({
        id: `PPL_${i}`,
        nameMain: `People ${i}`,
        languageFamilyId: "FLG_BANTU",
        currentCountries: [],
        content: {},
      }));

      (getAllAfrikPeoples as any).mockResolvedValue(mockPeoples);

      const result = await getPeoples(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
    });

    it("should handle pagination correctly", async () => {
      const mockPeoples = Array.from({ length: 10 }, (_, i) => ({
        id: `PPL_${i}`,
        nameMain: `People ${i}`,
        languageFamilyId: "FLG_BANTU",
        currentCountries: [],
        content: {},
      }));

      (getAllAfrikPeoples as any).mockResolvedValue(mockPeoples);

      const page1 = await getPeoples(1, 2);
      const page2 = await getPeoples(2, 2);

      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
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

      (getAfrikPeopleById as any).mockResolvedValue(mockPeople);

      const people = await getPeopleById("PPL_SHONA");

      expect(people).toBeDefined();
      expect(people?.id).toBe("PPL_SHONA");
      expect(people?.nameMain).toBe("Shona");
    });

    it("should return null for non-existent people", async () => {
      (getAfrikPeopleById as any).mockResolvedValue(null);

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

      (getAfrikPeoplesByLanguageFamily as any).mockResolvedValue(mockPeoples);

      const peoples = await getPeoplesByLanguageFamily("FLG_BANTU");

      expect(Array.isArray(peoples)).toBe(true);
      expect(peoples.length).toBe(1);
      expect(peoples[0].languageFamilyId).toBe("FLG_BANTU");
    });
  });
});

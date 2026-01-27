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

import {
  getAllAfrikPeoples,
  getAfrikPeopleById,
  getAfrikPeoplesByLanguageFamily,
} from "@/lib/supabase/queries/afrik/peoples";

// Mock global fetch
global.fetch = vi.fn();

/**
 * TDD Phase: RED
 * Test: People Service - business logic for peoples
 */
describe("People Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockClear();
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

      // Mock fetch response for internal route
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeoples,
      });

      const result = await getPeoples(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);

      // Verify fetch was called with correct URL and tags
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/internal/peoples"),
        expect.objectContaining({
          next: expect.objectContaining({
            tags: ["afrik-peoples"],
            revalidate: 3600,
          }),
        })
      );
    });

    it("should handle pagination correctly", async () => {
      const mockPeoples = Array.from({ length: 10 }, (_, i) => ({
        id: `PPL_${i}`,
        nameMain: `People ${i}`,
        languageFamilyId: "FLG_BANTU",
        currentCountries: [],
        content: {},
      }));

      // Mock fetch response for internal route
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockPeoples,
      });

      const page1 = await getPeoples(1, 2);
      const page2 = await getPeoples(2, 2);

      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
    });

    it("should fallback to direct query if fetch fails", async () => {
      const mockPeoples = Array.from({ length: 10 }, (_, i) => ({
        id: `PPL_${i}`,
        nameMain: `People ${i}`,
        languageFamilyId: "FLG_BANTU",
        currentCountries: [],
        content: {},
      }));

      // Mock fetch to fail
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));
      (getAllAfrikPeoples as any).mockResolvedValue(mockPeoples);

      const result = await getPeoples(1, 5);

      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
      // Verify fallback was used
      expect(getAllAfrikPeoples).toHaveBeenCalled();
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

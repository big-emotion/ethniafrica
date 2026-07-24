import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "../languageFamilyService";

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAllAfrikLanguageFamilies: vi.fn(),
  getAfrikLanguageFamilyById: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeoplesByLanguageFamily: vi.fn(),
}));

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import { getAfrikPeoplesByLanguageFamily } from "@/lib/supabase/queries/afrik/peoples";

describe("Language Family Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLanguageFamilies", () => {
    it("should return paginated language families", async () => {
      const mockFamilies = Array.from({ length: 10 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));

      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockFamilies);

      const result = await getLanguageFamilies(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
      expect(getAllAfrikLanguageFamilies).toHaveBeenCalled();
    });

    it("should handle pagination correctly", async () => {
      const mockFamilies = Array.from({ length: 10 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));

      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockFamilies);
      const page1 = await getLanguageFamilies(1, 2);
      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockFamilies);
      const page2 = await getLanguageFamilies(2, 2);

      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
    });
  });

  describe("getLanguageFamilyById", () => {
    // @req REQ-033
    it("should derive associated peoples from canonical people relationships", async () => {
      const mockFamily = {
        id: "FLG_AFROASIATIQUE",
        nameFr: "Afro-asiatique",
        content: {
          associatedPeoples: [
            { name: "Stale JSONB people", peopleId: "PPL_STALE" },
          ],
        },
      };
      const mockPeoples = [
        {
          id: "PPL_AMHARA",
          nameMain: "Amhara",
          languageFamilyId: "FLG_AFROASIATIQUE",
          currentCountries: ["ETH"],
          content: {},
        },
        {
          id: "PPL_OROMO",
          nameMain: "Oromo",
          languageFamilyId: "FLG_AFROASIATIQUE",
          currentCountries: ["ETH"],
          content: {},
        },
      ];

      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(mockFamily);
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

      const family = await getLanguageFamilyById("FLG_AFROASIATIQUE");

      const expectedReferences = [
        { name: "Amhara", peopleId: "PPL_AMHARA" },
        { name: "Oromo", peopleId: "PPL_OROMO" },
      ];

      expect(getAfrikPeoplesByLanguageFamily).toHaveBeenCalledWith(
        "FLG_AFROASIATIQUE"
      );
      expect(family?.associatedPeoples).toEqual(expectedReferences);
      expect(family?.content.associatedPeoples).toEqual(expectedReferences);
    });

    // @req REQ-033
    it("should return null without querying peoples for a missing family", async () => {
      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(null);

      const family = await getLanguageFamilyById("FLG_NONEXISTENT");

      expect(family).toBeNull();
      expect(getAfrikPeoplesByLanguageFamily).not.toHaveBeenCalled();
    });
  });
});

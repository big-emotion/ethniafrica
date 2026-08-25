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
  getPeopleCountsByLanguageFamily: vi.fn(),
  UNCLASSIFIED_FAMILY_KEY: "__unclassified__",
}));

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import {
  getAfrikPeoplesByLanguageFamily,
  getPeopleCountsByLanguageFamily,
  UNCLASSIFIED_FAMILY_KEY,
} from "@/lib/supabase/queries/afrik/peoples";

describe("Language Family Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLanguageFamilies", () => {
    beforeEach(() => {
      vi.mocked(getPeopleCountsByLanguageFamily).mockResolvedValue(new Map());
    });

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

    // @req REQ-108
    it("should compute peopleCount from stored rows, not fiche-declared content", async () => {
      const mockFamilies = [
        {
          id: "FLG_X",
          nameFr: "Family X",
          content: {
            associatedPeoples: [{ name: "Stale", peopleId: "PPL_1" }],
          },
        },
      ];
      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockFamilies);
      vi.mocked(getPeopleCountsByLanguageFamily).mockResolvedValue(
        new Map([["FLG_X", 28]])
      );

      const result = await getLanguageFamilies(1, 20);

      expect(result.data[0].peopleCount).toBe(28);
    });

    // @req REQ-108
    it("should report 0 for a family with no stored peoples rather than omitting the field", async () => {
      const mockFamilies = [{ id: "FLG_EMPTY", nameFr: "Empty", content: {} }];
      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockFamilies);
      vi.mocked(getPeopleCountsByLanguageFamily).mockResolvedValue(new Map());

      const result = await getLanguageFamilies(1, 20);

      expect(result.data[0].peopleCount).toBe(0);
    });

    // @req REQ-108
    it("should surface peoples with a null or unmatched family as unclassified rather than omitting them", async () => {
      const mockFamilies = [{ id: "FLG_X", nameFr: "Family X", content: {} }];
      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockFamilies);
      vi.mocked(getPeopleCountsByLanguageFamily).mockResolvedValue(
        new Map([
          ["FLG_X", 739],
          [UNCLASSIFIED_FAMILY_KEY, 60],
          // References a family id that isn't published/returnable.
          ["FLG_UNPUBLISHED", 4],
        ])
      );

      const result = await getLanguageFamilies(1, 20);

      expect(result.unclassifiedPeoplesCount).toBe(64);
    });

    // @req REQ-108
    it("should reconcile the reported family total with the returnable families and the peoples corpus", async () => {
      const mockFamilies = Array.from({ length: 20 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));
      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockFamilies);

      const peopleCounts = new Map<string, number>();
      mockFamilies.forEach((family, i) => peopleCounts.set(family.id, i + 1));
      peopleCounts.set(UNCLASSIFIED_FAMILY_KEY, 64);
      const totalPeoples = Array.from(peopleCounts.values()).reduce(
        (sum, count) => sum + count,
        0
      );
      vi.mocked(getPeopleCountsByLanguageFamily).mockResolvedValue(
        peopleCounts
      );

      const result = await getLanguageFamilies(1, 20);

      // No 24-vs-20 gap: the reported total equals the number of families
      // the endpoint can actually return.
      expect(result.total).toBe(mockFamilies.length);

      const summedPeopleCounts = result.data.reduce(
        (sum, family) => sum + (family.peopleCount ?? 0),
        0
      );
      expect(summedPeopleCounts + result.unclassifiedPeoplesCount).toBe(
        totalPeoples
      );
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

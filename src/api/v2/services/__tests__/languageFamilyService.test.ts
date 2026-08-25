import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "../languageFamilyService";

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAllAfrikLanguageFamilies: vi.fn(),
  getAfrikLanguageFamilyById: vi.fn(),
  countAfrikLanguageFamilies: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeoplesByLanguageFamily: vi.fn(),
}));

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
  countAfrikLanguageFamilies,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import { getAfrikPeoplesByLanguageFamily } from "@/lib/supabase/queries/afrik/peoples";

describe("Language Family Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLanguageFamilies", () => {
    it("should return paginated language families", async () => {
      const mockPage = Array.from({ length: 5 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));

      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockPage);
      vi.mocked(countAfrikLanguageFamilies).mockResolvedValue(10);

      const result = await getLanguageFamilies(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
      expect(getAllAfrikLanguageFamilies).toHaveBeenCalledWith(1, 5);
    });

    it("should handle pagination correctly", async () => {
      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue([
        { id: "FLG_0", nameFr: "Family 0", content: {} },
        { id: "FLG_1", nameFr: "Family 1", content: {} },
      ]);
      vi.mocked(countAfrikLanguageFamilies).mockResolvedValue(10);
      const page1 = await getLanguageFamilies(1, 2);

      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue([
        { id: "FLG_2", nameFr: "Family 2", content: {} },
        { id: "FLG_3", nameFr: "Family 3", content: {} },
      ]);
      vi.mocked(countAfrikLanguageFamilies).mockResolvedValue(10);
      const page2 = await getLanguageFamilies(2, 2);

      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
      expect(getAllAfrikLanguageFamilies).toHaveBeenNthCalledWith(1, 1, 2);
      expect(getAllAfrikLanguageFamilies).toHaveBeenNthCalledWith(2, 2, 2);
    });

    // @req REQ-110
    it("should push pagination down to the database layer instead of slicing an unranged fetch in memory", async () => {
      const pageOfFamilies = [
        { id: "FLG_20", nameFr: "Family 20", content: {} },
        { id: "FLG_21", nameFr: "Family 21", content: {} },
      ];

      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(pageOfFamilies);
      vi.mocked(countAfrikLanguageFamilies).mockResolvedValue(24);

      const result = await getLanguageFamilies(11, 2);

      // Requested page/perPage must reach the query layer so it can apply
      // .range() — an unranged fetch is silently capped by PostgREST's
      // server-side max-rows setting, which is the REQ-110 root cause.
      expect(getAllAfrikLanguageFamilies).toHaveBeenCalledWith(11, 2);
      expect(result.data).toEqual(pageOfFamilies);
      // total must come from a real count query, never from the length of
      // the (now page-sized) array returned by the query layer.
      expect(result.total).toBe(24);
      expect(countAfrikLanguageFamilies).toHaveBeenCalled();
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

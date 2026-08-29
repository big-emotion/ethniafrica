import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "../languageFamilyService";

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAllAfrikLanguageFamilies: vi.fn(),
  getAfrikLanguageFamilyById: vi.fn(),
  countAfrikLanguageFamilies: vi.fn(),
  getAfrikLanguageFamilyRoster: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/languageFamilyFacet", () => ({
  countUnclassifiedPeoples: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeoplesByLanguageFamily: vi.fn(),
  getPeopleCountsByLanguageFamily: vi.fn(),
  UNCLASSIFIED_FAMILY_KEY: "__unclassified__",
}));

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
  countAfrikLanguageFamilies,
  getAfrikLanguageFamilyRoster,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import { countUnclassifiedPeoples } from "@/lib/supabase/queries/afrik/languageFamilyFacet";
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
      vi.mocked(getAfrikLanguageFamilyRoster).mockResolvedValue([]);
      vi.mocked(countUnclassifiedPeoples).mockResolvedValue(0);
    });

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
      expect(getAllAfrikLanguageFamilies).toHaveBeenCalledWith(1, 5, undefined);
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
      expect(getAllAfrikLanguageFamilies).toHaveBeenNthCalledWith(
        1,
        1,
        2,
        undefined
      );
      expect(getAllAfrikLanguageFamilies).toHaveBeenNthCalledWith(
        2,
        2,
        2,
        undefined
      );
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
      expect(getAllAfrikLanguageFamilies).toHaveBeenCalledWith(
        11,
        2,
        undefined
      );
      expect(result.data).toEqual(pageOfFamilies);
      // total must come from a real count query, never from the length of
      // the (now page-sized) array returned by the query layer.
      expect(result.total).toBe(24);
      expect(countAfrikLanguageFamilies).toHaveBeenCalled();
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
      vi.mocked(getAfrikLanguageFamilyRoster).mockResolvedValue([
        { id: "FLG_X", nameFr: "Family X" },
      ]);
      vi.mocked(countUnclassifiedPeoples).mockResolvedValue(64);

      const result = await getLanguageFamilies(1, 20);

      expect(countUnclassifiedPeoples).toHaveBeenCalledWith(["FLG_X"]);
      expect(result.unclassifiedPeoplesCount).toBe(64);
    });

    /**
     * The figure used to be a subtraction against the families on the page in
     * front of the reader, so turning to page 2 changed how many peoples the
     * corpus was said to leave unclassified. It is a measure of the corpus;
     * paging through a reading of it cannot move it.
     */
    // @req REQ-108
    it("should measure unclassified peoples against the whole roster, not the page on screen", async () => {
      vi.mocked(getAfrikLanguageFamilyRoster).mockResolvedValue([
        { id: "FLG_A", nameFr: "A" },
        { id: "FLG_B", nameFr: "B" },
      ]);
      vi.mocked(countUnclassifiedPeoples).mockResolvedValue(60);

      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue([
        { id: "FLG_A", nameFr: "A", content: {} },
      ]);
      const firstPage = await getLanguageFamilies(1, 1);

      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue([
        { id: "FLG_B", nameFr: "B", content: {} },
      ]);
      const secondPage = await getLanguageFamilies(2, 1);

      expect(secondPage.unclassifiedPeoplesCount).toBe(
        firstPage.unclassifiedPeoplesCount
      );
      expect(countUnclassifiedPeoples).toHaveBeenNthCalledWith(1, [
        "FLG_A",
        "FLG_B",
      ]);
      expect(countUnclassifiedPeoples).toHaveBeenNthCalledWith(2, [
        "FLG_A",
        "FLG_B",
      ]);
    });

    /**
     * The Explorer families facet narrows by country. The narrowed set of ids
     * has to reach the query layer, or the "filtered" page would be the page
     * of everything with the filter reapplied to it — the same mistake the
     * unclassified count above was making one field over.
     */
    // @req REQ-110
    it("should push a narrowed selection down to the query layer, list and count alike", async () => {
      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue([]);
      vi.mocked(countAfrikLanguageFamilies).mockResolvedValue(2);

      await getLanguageFamilies(1, 12, { ids: ["FLG_A", "FLG_B"] });

      expect(getAllAfrikLanguageFamilies).toHaveBeenCalledWith(1, 12, [
        "FLG_A",
        "FLG_B",
      ]);
      expect(countAfrikLanguageFamilies).toHaveBeenCalledWith([
        "FLG_A",
        "FLG_B",
      ]);
    });

    // @req REQ-108
    it("should reconcile the reported family total with the returnable families and the peoples corpus", async () => {
      const mockFamilies = Array.from({ length: 20 }, (_, i) => ({
        id: `FLG_${i}`,
        nameFr: `Family ${i}`,
        content: {},
      }));
      vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(mockFamilies);
      vi.mocked(countAfrikLanguageFamilies).mockResolvedValue(
        mockFamilies.length
      );

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
      vi.mocked(getAfrikLanguageFamilyRoster).mockResolvedValue(
        mockFamilies.map((family) => ({ id: family.id, nameFr: family.nameFr }))
      );
      vi.mocked(countUnclassifiedPeoples).mockResolvedValue(64);

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

    /**
     * A macro-family's peoples all carry a sub-family's id, so the canonical
     * query returns nothing. Replacing the declaration with that emptiness
     * destroyed the references the fiche does make and put nothing in their
     * place — and the footprint fallback reads exactly this field, so it could
     * never fire. An empty derivation is not a correction.
     */
    // @req REQ-033
    it("keeps the fiche's declared peoples when no stored row carries the family's id", async () => {
      const declared = [
        { name: "Amazigh", peopleId: "PPL_AMAZIGH_MACRO" },
        { name: "Haoussa", peopleId: "PPL_HAUSA" },
      ];

      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue({
        id: "FLG_AFROASIATIQUE",
        nameFr: "Afro-asiatique",
        content: { associatedPeoples: declared },
      });
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue([]);

      const family = await getLanguageFamilyById("FLG_AFROASIATIQUE");

      expect(family?.associatedPeoples).toEqual(declared);
      expect(family?.content.associatedPeoples).toEqual(declared);
    });

    // @req REQ-033
    it("should return null without querying peoples for a missing family", async () => {
      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(null);

      const family = await getLanguageFamilyById("FLG_NONEXISTENT");

      expect(family).toBeNull();
      expect(getAfrikPeoplesByLanguageFamily).not.toHaveBeenCalled();
    });

    // @req REQ-119
    it("should derive footprintByCountry from associated peoples' currentCountries, counting each country once per people", async () => {
      const mockFamily = {
        id: "FLG_AFROASIATIQUE",
        nameFr: "Afro-asiatique",
        content: {},
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
          currentCountries: ["ETH", "SOM"],
          content: {},
        },
      ];

      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(mockFamily);
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

      const family = await getLanguageFamilyById("FLG_AFROASIATIQUE");

      expect(family?.footprintByCountry).toEqual({ ETH: 2, SOM: 1 });
    });

    // @req REQ-119
    it("should report an empty footprintByCountry rather than omitting it when no people carries a country", async () => {
      const mockFamily = { id: "FLG_EMPTY", nameFr: "Empty", content: {} };
      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(mockFamily);
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue([]);

      const family = await getLanguageFamilyById("FLG_EMPTY");

      expect(family?.footprintByCountry).toEqual({});
    });
  });
});

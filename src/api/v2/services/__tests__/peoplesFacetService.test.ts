import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetPaginated,
  mockGetCountryIndex,
  mockGetFamilies,
  mockGetFamilyCounts,
  mockGetCountries,
  mockGetCountryCounts,
} = vi.hoisted(() => ({
  mockGetPaginated: vi.fn(),
  mockGetCountryIndex: vi.fn(),
  mockGetFamilies: vi.fn(),
  mockGetFamilyCounts: vi.fn(),
  mockGetCountries: vi.fn(),
  mockGetCountryCounts: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getPaginatedAfrikPeoples: (...args: unknown[]) => mockGetPaginated(...args),
  getAfrikPeopleCountryIndex: (...args: unknown[]) =>
    mockGetCountryIndex(...args),
  getPeopleCountsByLanguageFamily: () => mockGetFamilyCounts(),
}));

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAllAfrikLanguageFamilies: () => mockGetFamilies(),
}));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryIndex: () => mockGetCountries(),
}));

vi.mock("@/api/v2/services/continentPeopleCounts", () => ({
  getContinentPeopleCounts: () => mockGetCountryCounts(),
}));

import {
  PEOPLES_FACET_PER_PAGE,
  getPeoplesFacetChoices,
  getPeoplesFacetCountryIndex,
  getPeoplesFacetPage,
} from "../peoplesFacet";

describe("the peoples facet's reading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPaginated.mockResolvedValue({ data: [], total: 0 });
  });

  // @req REQ-108
  it("asks the database for the page the reader is on, under the filters they set", async () => {
    mockGetPaginated.mockResolvedValue({
      data: [{ id: "PPL_AKAN" }],
      total: 41,
    });

    const result = await getPeoplesFacetPage(3, {
      familyId: "FLG_NIGER_CONGO",
      countryId: "GHA",
      letter: "A",
    });

    expect(mockGetPaginated).toHaveBeenCalledWith(3, PEOPLES_FACET_PER_PAGE, {
      languageFamilyId: "FLG_NIGER_CONGO",
      countryId: "GHA",
      initialLetter: "A",
    });
    expect(result.total).toBe(41);
    expect(result.totalPages).toBe(Math.ceil(41 / PEOPLES_FACET_PER_PAGE));
  });

  /**
   * The page number comes off a URL a reader can type, so it is untrusted
   * input rather than a widget's state.
   */
  // @req REQ-108
  it("reads a page number no set could have as the first page", async () => {
    await getPeoplesFacetPage(0, {
      familyId: null,
      countryId: null,
      letter: null,
    });
    await getPeoplesFacetPage(-4, {
      familyId: null,
      countryId: null,
      letter: null,
    });

    expect(mockGetPaginated).toHaveBeenNthCalledWith(
      1,
      1,
      PEOPLES_FACET_PER_PAGE,
      {}
    );
    expect(mockGetPaginated).toHaveBeenNthCalledWith(
      2,
      1,
      PEOPLES_FACET_PER_PAGE,
      {}
    );
  });

  // @req REQ-108
  it("leaves an unset filter out of the query rather than sending an empty one", async () => {
    await getPeoplesFacetPage(1, {
      familyId: null,
      countryId: "GHA",
      letter: null,
    });

    expect(mockGetPaginated).toHaveBeenCalledWith(1, PEOPLES_FACET_PER_PAGE, {
      countryId: "GHA",
    });
  });

  // @req REQ-117
  it("hands the map the whole filtered set, under the same filters as the list", async () => {
    mockGetCountryIndex.mockResolvedValue([
      { id: "PPL_AKAN", nameMain: "Akan", countryIds: ["GHA", "CIV"] },
    ]);

    const index = await getPeoplesFacetCountryIndex({
      familyId: "FLG_NIGER_CONGO",
      countryId: null,
      letter: null,
    });

    expect(mockGetCountryIndex).toHaveBeenCalledWith({
      languageFamilyId: "FLG_NIGER_CONGO",
    });
    expect(index).toHaveLength(1);
  });
});

describe("the peoples facet's filter choices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFamilies.mockResolvedValue([
      { id: "FLG_BANTU", nameFr: "Bantoues" },
      { id: "FLG_KHOISAN", nameFr: "Khoïsan" },
    ]);
    mockGetFamilyCounts.mockResolvedValue(new Map([["FLG_BANTU", 120]]));
    mockGetCountries.mockResolvedValue([
      { id: "GHA", nameFr: "République du Ghana" },
      { id: "ATA", nameFr: "Antarctique" },
    ]);
    mockGetCountryCounts.mockResolvedValue({ GHA: 84 });
  });

  /**
   * A filter that can only ever return nothing is worse than an absent one: it
   * reads as a claim that the corpus has this family, and answers "aucun
   * peuple" when the reader takes the claim up.
   */
  // @req REQ-106
  it("offers only the families and countries the corpus documents a people in", async () => {
    const choices = await getPeoplesFacetChoices();

    expect(choices.families).toEqual([{ id: "FLG_BANTU", label: "Bantoues" }]);
    expect(choices.countries).toEqual([
      { id: "GHA", label: "République du Ghana" },
    ]);
  });

  /**
   * Fifty-four options in one native select, so the order is how a reader finds
   * one. A byte comparison files every accented name after Z, which in a French
   * list of countries is most of the ones a reader is looking for.
   */
  // @req REQ-106
  it("orders the countries as a French reader would read them, accents in place", async () => {
    mockGetCountries.mockResolvedValue([
      { id: "ZWE", nameFr: "Zimbabwe" },
      { id: "EGY", nameFr: "Égypte" },
      { id: "GHA", nameFr: "Ghana" },
    ]);
    mockGetCountryCounts.mockResolvedValue({ ZWE: 3, EGY: 5, GHA: 84 });

    const choices = await getPeoplesFacetChoices();

    expect(choices.countries.map((option) => option.label)).toEqual([
      "Égypte",
      "Ghana",
      "Zimbabwe",
    ]);
  });
});

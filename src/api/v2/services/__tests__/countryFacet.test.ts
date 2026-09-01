import { describe, it, expect, vi, beforeEach } from "vitest";

// unstable_cache registrations happen at module load, so they are recorded
// outside the mock — beforeEach's clearAllMocks would otherwise erase them.
const { unstableCacheMock, cacheRegistrations } = vi.hoisted(() => {
  const registrations: Array<{ keys: unknown; options: unknown }> = [];
  return {
    cacheRegistrations: registrations,
    unstableCacheMock: vi.fn(
      (
        callback: (...args: unknown[]) => unknown,
        keys: unknown,
        options: unknown
      ) => {
        registrations.push({ keys, options });
        return callback;
      }
    ),
  };
});
vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryIndex: vi.fn(),
}));
vi.mock("@/api/v2/services/continentPeopleCounts", () => ({
  getContinentPeopleCounts: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/countryLanguageFamilies", () => ({
  getLanguageFamilyIdsByCountry: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/languageFamilyLabels", () => ({
  getLanguageFamilyLabels: vi.fn(),
}));

import {
  getCountryFacetSelection,
  parseCountryFacetSort,
} from "../countryFacet";
import { getCountryIndex } from "@/api/v2/services/countryService";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { getLanguageFamilyIdsByCountry } from "@/lib/supabase/queries/afrik/countryLanguageFamilies";
import { getLanguageFamilyLabels } from "@/lib/supabase/queries/afrik/languageFamilyLabels";

/**
 * Four countries whose corpus names cover the cases that matter: one the
 * common-name table rewrites (COD), one it leaves alone (NGA), and one whose
 * id it has never heard of (ZZZ).
 */
function mockCorpus() {
  vi.mocked(getCountryIndex).mockResolvedValue([
    { id: "NGA", nameFr: "Nigéria" },
    { id: "COD", nameFr: "République démocratique du Congo" },
    { id: "BEN", nameFr: "Bénin" },
    { id: "ZZZ", nameFr: "Pays d'essai" },
  ]);
  vi.mocked(getContinentPeopleCounts).mockResolvedValue({
    NGA: 40,
    COD: 12,
    BEN: 12,
  });
  vi.mocked(getLanguageFamilyIdsByCountry).mockResolvedValue(
    new Map([
      ["NGA", ["FLG_AFRO_ASIATIQUE", "FLG_NIGER_CONGO"]],
      ["COD", ["FLG_NIGER_CONGO", "FLG_NILO_SAHARIEN"]],
      ["BEN", ["FLG_NIGER_CONGO"]],
    ])
  );
  vi.mocked(getLanguageFamilyLabels).mockResolvedValue([
    { id: "FLG_AFRO_ASIATIQUE", nameFr: "Afro-asiatique" },
    { id: "FLG_KHOISAN", nameFr: "Khoïsan" },
    { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo" },
    { id: "FLG_NILO_SAHARIEN", nameFr: "Nilo-saharien" },
  ]);
}

const unfiltered = {
  languageFamilyId: null,
  search: null,
  sort: "nom",
} as const;

describe("the countries facet's selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCorpus();
  });

  /**
   * The name the reader sees is the one the fiche's own heading prints —
   * `getFrenchCountryCommonName`, the same function `mapCountryDetail` runs.
   * A second name table here is exactly how a list, a panel and a fiche come
   * to call one country three things.
   *
   * It does diverge from the corpus: CLDR writes "Nigeria" where the fiche
   * wrote "Nigéria", and "Congo-Kinshasa" for the RDC. The divergence is
   * already on screen today — it is the fiche's own heading — so following it
   * keeps one answer in the app instead of adding a second.
   */
  // @req REQ-116
  it("labels a country with the name its fiche heads itself with", async () => {
    const { rows } = await getCountryFacetSelection(unfiltered);
    const labels = Object.fromEntries(rows.map((row) => [row.id, row.label]));

    expect(labels.COD).toBe("Congo-Kinshasa");
    expect(labels.NGA).toBe("Nigeria");
  });

  // @req REQ-116
  it("keeps the corpus's own name for a country the common-name table cannot resolve", async () => {
    const { rows } = await getCountryFacetSelection(unfiltered);

    expect(rows.find((row) => row.id === "ZZZ")?.label).toBe("Pays d'essai");
  });

  // @req REQ-116
  it("orders by the displayed name, not by the one stored under it", async () => {
    const { rows } = await getCountryFacetSelection(unfiltered);

    // "Congo-Kinshasa" sorts after "Bénin" and before "Nigéria"; the corpus
    // name it replaces ("République…") would have sorted last.
    expect(rows.map((row) => row.id)).toEqual(["BEN", "COD", "NGA", "ZZZ"]);
  });

  // @req REQ-116
  it("carries each country's documented peoples, and zero where the corpus counts none", async () => {
    const { rows } = await getCountryFacetSelection(unfiltered);
    const counts = Object.fromEntries(
      rows.map((row) => [row.id, row.documentedPeopleCount])
    );

    expect(counts).toEqual({ NGA: 40, COD: 12, BEN: 12, ZZZ: 0 });
  });

  // @req REQ-108
  it("ranks by documented peoples on request, settling a tie on the name", async () => {
    const { rows } = await getCountryFacetSelection({
      languageFamilyId: null,
      sort: "peuples",
    });

    expect(rows.map((row) => row.id)).toEqual(["NGA", "BEN", "COD", "ZZZ"]);
  });

  // @req REQ-116
  it("narrows to the countries a family reaches", async () => {
    const { rows } = await getCountryFacetSelection({
      languageFamilyId: "FLG_NILO_SAHARIEN",
      sort: "nom",
    });

    expect(rows.map((row) => row.id)).toEqual(["COD"]);
  });

  it("matches a country name without regard to accents or case", async () => {
    const byAccent = await getCountryFacetSelection({
      ...unfiltered,
      search: "benin",
    });
    const byCase = await getCountryFacetSelection({
      ...unfiltered,
      search: "CONGO",
    });

    expect(byAccent.rows.map((row) => row.id)).toEqual(["BEN"]);
    expect(byCase.rows.map((row) => row.id)).toEqual(["COD"]);
  });

  it("matches a country by its identifier", async () => {
    const { rows } = await getCountryFacetSelection({
      ...unfiltered,
      search: "nga",
    });

    expect(rows.map((row) => row.id)).toEqual(["NGA"]);
  });

  it("does not create a match across the identifier and name boundary", async () => {
    const { rows } = await getCountryFacetSelection({
      ...unfiltered,
      search: "n b",
    });

    expect(rows).toEqual([]);
  });

  it("collapses repeated spaces in a multiword country search", async () => {
    const { rows } = await getCountryFacetSelection({
      ...unfiltered,
      search: "pays   d'essai",
    });

    expect(rows.map((row) => row.id)).toEqual(["ZZZ"]);
  });

  it("intersects text search with the selected language family", async () => {
    const matching = await getCountryFacetSelection({
      languageFamilyId: "FLG_NIGER_CONGO",
      search: "benin",
      sort: "nom",
    });
    const excluded = await getCountryFacetSelection({
      languageFamilyId: "FLG_NILO_SAHARIEN",
      search: "benin",
      sort: "nom",
    });

    expect(matching.rows.map((row) => row.id)).toEqual(["BEN"]);
    expect(excluded.rows).toEqual([]);
  });

  it("treats a whitespace-only search as no narrowing", async () => {
    const { rows } = await getCountryFacetSelection({
      ...unfiltered,
      search: "   ",
    });

    expect(rows).toHaveLength(4);
  });

  /**
   * A filter nobody can satisfy is worse than no filter: the reader cannot
   * tell an empty corpus from a mistyped URL. So the option list is built from
   * the mapping the filter reads, and a family present nowhere is not offered.
   */
  // @req REQ-116
  it("offers only the families some country actually holds", async () => {
    const { familyOptions } = await getCountryFacetSelection(unfiltered);

    expect(familyOptions).toEqual([
      { value: "FLG_AFRO_ASIATIQUE", label: "Afro-asiatique" },
      { value: "FLG_NIGER_CONGO", label: "Niger-Congo" },
      { value: "FLG_NILO_SAHARIEN", label: "Nilo-saharien" },
    ]);
  });

  // @req REQ-116
  it("answers an unknown family with nothing rather than with everything", async () => {
    const { rows } = await getCountryFacetSelection({
      languageFamilyId: "FLG_NOWHERE",
      sort: "nom",
    });

    expect(rows).toEqual([]);
  });

  /**
   * The count under the heading has to say what the corpus holds, not what the
   * filter left, or a narrowed page reads as a shrunken atlas.
   */
  // @req REQ-116
  it("reports the whole corpus alongside a narrowed selection", async () => {
    const selection = await getCountryFacetSelection({
      languageFamilyId: "FLG_NILO_SAHARIEN",
      sort: "nom",
    });

    expect(selection.rows).toHaveLength(1);
    expect(selection.totalCountries).toBe(4);
  });

  // @req REQ-116
  it("caches the corpus-wide fold rather than repeating it on every render", () => {
    expect(cacheRegistrations).toContainEqual({
      keys: ["country-facet-language-families"],
      options: { revalidate: 3600 },
    });
  });
});

describe("the sort a countries-facet URL asks for", () => {
  // @req REQ-108
  it("reads the two sorts the facet offers", () => {
    expect(parseCountryFacetSort("nom")).toBe("nom");
    expect(parseCountryFacetSort("peuples")).toBe("peuples");
  });

  // A value nobody offered is a hand-edited URL, and the honest answer is the
  // default view rather than an empty one.
  // @req REQ-108
  it("falls back to the name order for anything else", () => {
    expect(parseCountryFacetSort(null)).toBe("nom");
    expect(parseCountryFacetSort("confiance")).toBe("nom");
  });
});

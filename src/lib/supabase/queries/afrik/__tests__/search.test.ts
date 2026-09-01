/**
 * Query-layer tests for the ranked search.
 *
 * Peoples and countries are ranked by the SQL functions of migration 044, so
 * these tests drive the RPC boundary: what parameters go down, and that the
 * order coming back is preserved rather than re-sorted here. The families
 * branch delegates to two mocked units — the full fetch (name-based ranking)
 * and the search_vector text match (decolonial-prose ranking, DEC-028) — so
 * this file asserts composition rather than re-testing either one.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("../languageFamilies", () => ({
  searchAfrikLanguageFamilies: vi.fn(),
  searchAfrikLanguageFamiliesByText: vi.fn(),
}));

import { ftsSearchEntities } from "../search";
import {
  searchAfrikLanguageFamilies,
  searchAfrikLanguageFamiliesByText,
} from "../languageFamilies";
import { createServerClient } from "../../../server";

function peopleRow(
  id: string,
  nameMain: string,
  over: Record<string, unknown> = {}
) {
  return {
    id,
    nameMain,
    languageFamilyId: "FLG_KROU",
    languageFamilyName: "Krou",
    currentCountries: ["CIV"],
    classificationStatus: null,
    content: {},
    confidence: 0.7,
    relevance: 0.5,
    exactMatch: false,
    snippet: null,
    ...over,
  };
}

describe("ftsSearchEntities", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rpc: any;
  let peoplesPayload: { total: number; rows: unknown[] };
  let countriesPayload: { total: number; rows: unknown[] };

  beforeEach(() => {
    vi.clearAllMocks();

    peoplesPayload = { total: 0, rows: [] };
    countriesPayload = { total: 0, rows: [] };

    rpc = vi.fn((fn: string) => {
      if (fn === "afrik_search_peoples")
        return Promise.resolve({ data: peoplesPayload, error: null });
      if (fn === "afrik_search_countries")
        return Promise.resolve({ data: countriesPayload, error: null });
      throw new Error(`unexpected rpc ${fn}`);
    });

    mockSupabase = { rpc };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (searchAfrikLanguageFamilies as any).mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (searchAfrikLanguageFamiliesByText as any).mockResolvedValue([]);
  });

  // @req REQ-002
  it("keeps the database's ranking instead of re-sorting by confidence", async () => {
    // Amhara carries the highest confidence and the lowest relevance. Under
    // the previous JS confidence sort it came first for this exact query.
    peoplesPayload = {
      total: 4,
      rows: [
        peopleRow("PPL_BETE", "Bété", { confidence: 0.71, exactMatch: true }),
        peopleRow("PPL_BETI", "Béti", { confidence: 0.61 }),
        peopleRow("PPL_BETI_FANG", "Béti-Fang", { confidence: 0.67 }),
        peopleRow("PPL_AMHARA", "Amhara", { confidence: 0.77 }),
      ],
    };

    const result = await ftsSearchEntities({ q: "Bété", limit: 20, offset: 0 });

    expect(result.peoples.map((p) => p.nameMain)).toEqual([
      "Bété",
      "Béti",
      "Béti-Fang",
      "Amhara",
    ]);
  });

  // @req REQ-019
  it("calls the ranking function with p_-prefixed named parameters", async () => {
    await ftsSearchEntities({ q: "bété", limit: 20, offset: 0 });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_peoples",
      expect.objectContaining({
        p_q: "bété",
        p_limit: 20,
        p_offset: 0,
        p_family_id: null,
        p_country_id: null,
      })
    );
  });

  // @req REQ-002
  it("reports the corpus-wide match count rather than the page size", async () => {
    peoplesPayload = {
      total: 16,
      rows: [peopleRow("PPL_BETE", "Bété"), peopleRow("PPL_BETI", "Béti")],
    };

    const result = await ftsSearchEntities({ q: "Bété", limit: 2, offset: 0 });

    expect(result.peoplesTotal).toBe(16);
    expect(result.peoples).toHaveLength(2);
    expect(result.total).toBe(16);
  });

  // @req REQ-002
  it("carries the ranking evidence onto every people", async () => {
    peoplesPayload = {
      total: 1,
      rows: [
        peopleRow("PPL_BETE", "Bété", {
          relevance: 0.81,
          exactMatch: true,
          snippet: "Magwé / [[Bété]]",
          confidence: 0.71,
        }),
      ],
    };

    const [people] = (
      await ftsSearchEntities({ q: "Bété", limit: 20, offset: 0 })
    ).peoples;

    expect(people.relevance).toBe(0.81);
    expect(people.exactMatch).toBe(true);
    expect(people.snippet).toBe("Magwé / [[Bété]]");
    expect(people.confidence).toBe(0.71);
    expect(people.languageFamilyName).toBe("Krou");
  });

  // @req REQ-019
  it("passes the epistemic and confidence filters down to the function", async () => {
    await ftsSearchEntities({
      q: "bété",
      limit: 20,
      offset: 0,
      classificationStatus: "contested",
      minConfidence: 0.5,
      sinceVerifiedAfter: "2026-01-01",
    });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_peoples",
      expect.objectContaining({
        p_classification_status: "contested",
        p_min_confidence: 0.5,
        p_since_verified_after: "2026-01-01",
      })
    );
  });

  // @req REQ-002
  it("scopes peoples to a language family with no text query at all", async () => {
    await ftsSearchEntities({ familyId: "FLG_KROU", limit: 20, offset: 0 });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_peoples",
      expect.objectContaining({ p_q: null, p_family_id: "FLG_KROU" })
    );
  });

  // @req REQ-002
  it("scopes peoples to a country with no text query at all", async () => {
    await ftsSearchEntities({ countryId: "CIV", limit: 20, offset: 0 });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_peoples",
      expect.objectContaining({ p_q: null, p_country_id: "CIV" })
    );
  });

  // @req REQ-002
  it("asks nothing of countries and families when browsing a relation", async () => {
    const result = await ftsSearchEntities({
      familyId: "FLG_KROU",
      limit: 20,
      offset: 0,
    });

    expect(rpc).not.toHaveBeenCalledWith(
      "afrik_search_countries",
      expect.anything()
    );
    expect(searchAfrikLanguageFamilies).not.toHaveBeenCalled();
    expect(result.countries).toEqual([]);
    expect(result.families).toEqual([]);
  });

  // @req REQ-002
  it("ranks language families exact before prefix before substring", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (searchAfrikLanguageFamilies as any).mockResolvedValue([
      { id: "FLG_NILO", nameFr: "Nilo-saharien (bantou compris)", content: {} },
      { id: "FLG_BANTOU_GROUP", nameFr: "Bantou (groupe élargi)", content: {} },
      { id: "FLG_BANTU", nameFr: "Bantou", content: {} },
    ]);

    const result = await ftsSearchEntities({
      q: "bantou",
      limit: 20,
      offset: 0,
    });

    expect(result.families.map((f) => f.id)).toEqual([
      "FLG_BANTU",
      "FLG_BANTOU_GROUP",
      "FLG_NILO",
    ]);
    expect(result.families[0].exactMatch).toBe(true);
  });

  // @req REQ-002
  it("matches a language family without regard to accents", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (searchAfrikLanguageFamilies as any).mockResolvedValue([
      { id: "FLG_BANTOIDE", nameFr: "Bantoïde", content: {} },
    ]);

    const result = await ftsSearchEntities({
      q: "bantoide",
      limit: 20,
      offset: 0,
    });

    expect(result.families[0].exactMatch).toBe(true);
  });

  // @req REQ-002
  it("counts families in the reported total", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (searchAfrikLanguageFamilies as any).mockResolvedValue([
      { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo", content: {} },
      { id: "FLG_BERBERE", nameFr: "Berbère", content: {} },
    ]);

    const result = await ftsSearchEntities({ q: "er", limit: 20, offset: 0 });

    expect(result.familiesTotal).toBe(2);
    expect(result.total).toBe(2);
  });

  // @req REQ-002
  it("surfaces a family whose only match is inside its decolonial text (DEC-028)", async () => {
    // FLG_KROU's name matches neither "administrateurs" nor any substring of
    // it — only content.decolonialHeader.whyProblematic does, in the corpus.
    // Before this ticket, rankLanguageFamilies filtered on nameFr alone and
    // dropped this family outright, however search_vector matched it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (searchAfrikLanguageFamilies as any).mockResolvedValue([
      { id: "FLG_KROU", nameFr: "Krou", content: {} },
      { id: "FLG_BANTU", nameFr: "Bantou", content: {} },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (searchAfrikLanguageFamiliesByText as any).mockResolvedValue(["FLG_KROU"]);

    const result = await ftsSearchEntities({
      q: "administrateurs",
      limit: 20,
      offset: 0,
    });

    expect(result.families.map((f) => f.id)).toEqual(["FLG_KROU"]);
    expect(result.families[0].exactMatch).toBe(false);
  });

  // @req REQ-002
  it("asks search_vector for the term before ranking families", async () => {
    await ftsSearchEntities({ q: "administrateurs", limit: 20, offset: 0 });

    expect(searchAfrikLanguageFamiliesByText).toHaveBeenCalledWith(
      "administrateurs"
    );
  });

  // @req REQ-129
  it("ranks a language family whose name carries an accent from an unaccented query", async () => {
    // searchAfrikLanguageFamilies no longer filters by ilike (accent-
    // sensitive); rankLanguageFamilies now owns the accent-insensitive
    // substring filter this exercises — FLG_MANDE is really named "Mandé"
    // in the corpus, so an unfixed ilike would have dropped it here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (searchAfrikLanguageFamilies as any).mockResolvedValue([
      { id: "FLG_MANDE", nameFr: "Mandé", content: {} },
      { id: "FLG_BANTU", nameFr: "Bantou", content: {} },
    ]);

    const result = await ftsSearchEntities({
      q: "mande",
      limit: 20,
      offset: 0,
    });

    expect(result.families.map((f) => f.id)).toEqual(["FLG_MANDE"]);
    expect(result.families[0].exactMatch).toBe(true);
  });

  // @req REQ-129
  it("surfaces a fiche whose name only partially matches the typed prefix", async () => {
    // Migration 051 does the actual prefix matching in SQL; this asserts the
    // query layer neither trims nor rejects a partial word before it reaches
    // the RPC, and passes an accented result straight through unmodified.
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_BAMBARA", "Bambara", { exactMatch: false })],
    };

    const result = await ftsSearchEntities({
      q: "bamba",
      limit: 20,
      offset: 0,
    });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_peoples",
      expect.objectContaining({ p_q: "bamba" })
    );
    expect(result.peoples.map((p) => p.nameMain)).toContain("Bambara");
  });

  // @req REQ-129
  it("surfaces an accented fiche name from an unaccented query", async () => {
    // Same rationale as the prefix test above: migration 052 folds accents
    // in SQL, so this only proves the query layer does not itself strip or
    // re-encode diacritics on the way back out.
    peoplesPayload = {
      total: 1,
      rows: [
        peopleRow("PPL_MANDE_MACRO", "Peuples Mandé (macro-groupe)", {
          exactMatch: false,
        }),
      ],
    };

    const result = await ftsSearchEntities({
      q: "mande",
      limit: 20,
      offset: 0,
    });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_peoples",
      expect.objectContaining({ p_q: "mande" })
    );
    expect(result.peoples.map((p) => p.nameMain)).toContain(
      "Peuples Mandé (macro-groupe)"
    );
  });

  // @req REQ-050
  it("surfaces a ranking failure instead of answering with an empty list", async () => {
    rpc.mockImplementation((fn: string) =>
      fn === "afrik_search_peoples"
        ? Promise.resolve({ data: null, error: { message: "boom" } })
        : Promise.resolve({ data: countriesPayload, error: null })
    );

    await expect(
      ftsSearchEntities({ q: "bété", limit: 20, offset: 0 })
    ).rejects.toMatchObject({ message: "boom" });
  });
});

/**
 * Query-layer tests for the ranked search.
 *
 * Every kind is ranked by a SQL function (migrations 044, 052, 065, 066,
 * 068), so these tests drive the RPC boundary: what parameters go down, that
 * the order coming back is preserved rather than re-sorted here, and that the
 * cross-kind `results` list merges the six kinds on the one score they share.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import { ftsSearchEntities } from "../search";
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

function countryRow(
  id: string,
  nameFr: string,
  over: Record<string, unknown> = {}
) {
  return {
    id,
    nameFr,
    etymology: null,
    nameOriginActor: null,
    content: {},
    relevance: 0.5,
    exactMatch: false,
    snippet: null,
    ...over,
  };
}

function personRow(
  id: string,
  fullName: string,
  over: Record<string, unknown> = {}
) {
  return {
    id,
    fullName,
    roleCategory: "ethnographer",
    relevance: 0.5,
    exactMatch: false,
    snippet: null,
    ...over,
  };
}

function patronymeRow(
  id: string,
  nameMain: string,
  over: Record<string, unknown> = {}
) {
  return {
    id,
    nameMain,
    nameSystem: "patronymic",
    casteOrSocialFunction: null,
    content: {},
    relevance: 0.5,
    exactMatch: false,
    snippet: null,
    ...over,
  };
}

function familyRow(
  id: string,
  nameFr: string,
  over: Record<string, unknown> = {}
) {
  return {
    id,
    nameFr,
    nameEn: null,
    classificationStatus: null,
    content: {},
    relevance: 0.3,
    exactMatch: false,
    normalizedScore: 0.6,
    snippet: null,
    ...over,
  };
}

function quizRow(
  id: string,
  prompt: string,
  over: Record<string, unknown> = {}
) {
  return {
    id,
    prompt,
    entityType: "people",
    entityId: "PPL_WOLOF",
    subjectName: "Wolof",
    relevance: 0.5,
    exactMatch: false,
    normalizedScore: 0.6,
    snippet: null,
    ...over,
  };
}

function languageRow(
  id: string,
  name: string,
  over: Record<string, unknown> = {}
) {
  return {
    id,
    name,
    familyId: "FLG_NIGER_CONGO",
    familyName: "Niger-Congo",
    content: {},
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
  let personsPayload: { total: number; rows: unknown[] };
  let patronymesPayload: { total: number; rows: unknown[] };
  let familiesPayload: { total: number; rows: unknown[] };
  let quizPayload: { total: number; rows: unknown[] };
  let languagesPayload: { total: number; rows: unknown[] };
  let leadsPayload: { rows: unknown[] };
  let personPeoplesRows: Record<string, unknown>[];

  beforeEach(() => {
    vi.clearAllMocks();

    peoplesPayload = { total: 0, rows: [] };
    countriesPayload = { total: 0, rows: [] };
    personsPayload = { total: 0, rows: [] };
    patronymesPayload = { total: 0, rows: [] };
    familiesPayload = { total: 0, rows: [] };
    quizPayload = { total: 0, rows: [] };
    languagesPayload = { total: 0, rows: [] };
    leadsPayload = { rows: [] };
    personPeoplesRows = [];

    rpc = vi.fn((fn: string) => {
      if (fn === "afrik_search_peoples")
        return Promise.resolve({ data: peoplesPayload, error: null });
      if (fn === "afrik_search_countries")
        return Promise.resolve({ data: countriesPayload, error: null });
      if (fn === "afrik_search_persons")
        return Promise.resolve({ data: personsPayload, error: null });
      if (fn === "afrik_search_patronymes")
        return Promise.resolve({ data: patronymesPayload, error: null });
      if (fn === "afrik_search_language_families")
        return Promise.resolve({ data: familiesPayload, error: null });
      if (fn === "afrik_search_quiz")
        return Promise.resolve({ data: quizPayload, error: null });
      if (fn === "afrik_search_languages")
        return Promise.resolve({ data: languagesPayload, error: null });
      if (fn === "afrik_search_leads")
        return Promise.resolve({ data: leadsPayload, error: null });
      throw new Error(`unexpected rpc ${fn}`);
    });

    mockSupabase = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "person_peoples") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: personPeoplesRows,
                error: null,
              })),
            })),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
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

  // @req REQ-002
  it("surfaces a people found only through prose (DEC-028), ranked below a name match", async () => {
    // "Soundiata" appears only in PPL_MANDINKA's historicalRole prose (weight
    // D, migration 058); PPL_KEITA carries it as a name (weight A, migration
    // 043). Migration 044's ranking function is what orders these — this test
    // only proves the query layer passes the DB order through untouched.
    peoplesPayload = {
      total: 2,
      rows: [
        peopleRow("PPL_KEITA", "Soundiata Keïta", {
          relevance: 0.9,
          exactMatch: true,
        }),
        peopleRow("PPL_MANDINKA", "Mandinka", {
          relevance: 0.12,
          exactMatch: false,
          snippet: "fondateur de l'empire du [[Soundiata]]",
        }),
      ],
    };

    const result = await ftsSearchEntities({
      q: "Soundiata",
      limit: 20,
      offset: 0,
    });

    expect(result.peoples.map((p) => p.nameMain)).toEqual([
      "Soundiata Keïta",
      "Mandinka",
    ]);
    expect(result.peoplesTotal).toBe(2);
  });

  // @req REQ-002
  it("surfaces a country found only through prose (DEC-028), ranked below a name match", async () => {
    // "Keïta" appears only in MLI's kingdoms[].historicalRole prose (weight
    // D, migration 059); a country literally carrying the name in its
    // name_fr would rank at weight A (migration 043). Migration 044's
    // ranking function is what orders these — this test only proves the
    // query layer passes the DB order through untouched.
    countriesPayload = {
      total: 2,
      rows: [
        countryRow("KEI", "Keïta", {
          relevance: 0.9,
          exactMatch: true,
        }),
        countryRow("MLI", "Mali", {
          relevance: 0.12,
          exactMatch: false,
          snippet: "fondé par l'empereur [[Keïta]]",
        }),
      ],
    };

    const result = await ftsSearchEntities({
      q: "Keïta",
      limit: 20,
      offset: 0,
    });

    expect(result.countries.map((c) => c.nameFr)).toEqual(["Keïta", "Mali"]);
    expect(result.countriesTotal).toBe(2);
  });

  // @req REQ-002
  it("surfaces a people through a declared spelling alias (DEC-034)", async () => {
    // PPL_GUR declares "Gour" as a spelling_aliases entry (migration 060),
    // folded into search_vector at weight B — the same weight as an exonym.
    // Migration 044's ranking function is what matches and orders this; this
    // test only proves the query layer passes an alias-matched row through
    // untouched, exactly as it already does for a name or an exonym match.
    peoplesPayload = {
      total: 1,
      rows: [
        peopleRow("PPL_GUR", "Gur", {
          relevance: 0.6,
          exactMatch: true,
          snippet: "[[Gour]]",
        }),
      ],
    };

    const result = await ftsSearchEntities({ q: "gour", limit: 20, offset: 0 });

    expect(result.peoples.map((p) => p.nameMain)).toEqual(["Gur"]);
    expect(result.peoplesTotal).toBe(1);
  });

  // @req REQ-002
  it("surfaces a people whose fiche differs from the query by a single-letter typo (DEC-034 trigram)", async () => {
    // PPL_WOLOF's name never lexically matches "Wolog" — no alias declares
    // it either. Migration 063's pg_trgm fallback in afrik_search_peoples is
    // what matches and ranks this row below any lexical/exact match
    // (lexical_match tier); this test only proves the query layer passes a
    // trigram-only-matched row through untouched, exactly as it already does
    // for a name, exonym or alias match.
    peoplesPayload = {
      total: 1,
      rows: [
        peopleRow("PPL_WOLOF", "Wolof", {
          relevance: 0.32,
          exactMatch: false,
        }),
      ],
    };

    const result = await ftsSearchEntities({
      q: "Wolog",
      limit: 20,
      offset: 0,
    });

    expect(result.peoples.map((p) => p.nameMain)).toEqual(["Wolof"]);
    expect(result.peoplesTotal).toBe(1);
  });

  // @req REQ-002
  it.each(["gour", "bt"])(
    "does not conjure a match for %s through the trigram mechanism (DEC-034 non-goal)",
    async (query) => {
      // Migration 063's ranking rule deliberately excludes short strings
      // ("gour", too short for reliable trigrams) and abbreviations ("bt")
      // from its similarity threshold — those stay the alias mechanism's
      // job (migration 060, ETNI-1408). The SQL function returns an empty
      // payload for these queries; this test proves the query layer reports
      // that emptiness rather than inventing a result.
      peoplesPayload = { total: 0, rows: [] };

      const result = await ftsSearchEntities({
        q: query,
        limit: 20,
        offset: 0,
      });

      expect(result.peoples).toEqual([]);
      expect(result.peoplesTotal).toBe(0);
    }
  );

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
  it("asks nothing of countries, families or the quiz bank when browsing a relation", async () => {
    const result = await ftsSearchEntities({
      familyId: "FLG_KROU",
      limit: 20,
      offset: 0,
    });

    for (const skipped of [
      "afrik_search_countries",
      "afrik_search_language_families",
      "afrik_search_quiz",
    ]) {
      expect(rpc).not.toHaveBeenCalledWith(skipped, expect.anything());
    }
    expect(result.countries).toEqual([]);
    expect(result.families).toEqual([]);
    expect(result.quizzes).toEqual([]);
  });

  // @req REQ-002
  it("calls afrik_search_language_families with p_-prefixed named parameters", async () => {
    await ftsSearchEntities({ q: "bantou", limit: 20, offset: 0 });

    expect(rpc).toHaveBeenCalledWith("afrik_search_language_families", {
      p_q: "bantou",
      p_limit: 20,
      p_offset: 0,
    });
  });

  // @req REQ-002
  it("keeps the database's ranking of language families instead of re-sorting them", async () => {
    // The tier ladder now lives in afrik_search_language_families (migration
    // 068). Handing the rows back in an order no JS comparator would produce
    // — a substring tier ahead of the exact match — is what proves the ladder
    // is no longer recomputed here.
    familiesPayload = {
      total: 3,
      rows: [
        familyRow("FLG_NILO", "Nilo-saharien (bantou compris)", {
          relevance: 0.3,
        }),
        familyRow("FLG_BANTU", "Bantou", { relevance: 1, exactMatch: true }),
        familyRow("FLG_BANTOU_GROUP", "Bantou (groupe élargi)", {
          relevance: 0.6,
        }),
      ],
    };

    const result = await ftsSearchEntities({
      q: "bantou",
      limit: 20,
      offset: 0,
    });

    expect(result.families.map((f) => f.id)).toEqual([
      "FLG_NILO",
      "FLG_BANTU",
      "FLG_BANTOU_GROUP",
    ]);
  });

  // @req REQ-002
  it("carries the ranking evidence onto every language family", async () => {
    familiesPayload = {
      total: 1,
      rows: [
        familyRow("FLG_BANTU", "Bantou", {
          relevance: 1,
          exactMatch: true,
          normalizedScore: 0.95,
          snippet: "[[Bantou]]",
        }),
      ],
    };

    const [family] = (
      await ftsSearchEntities({ q: "bantou", limit: 20, offset: 0 })
    ).families;

    expect(family.relevance).toBe(1);
    expect(family.exactMatch).toBe(true);
    expect(family.normalizedScore).toBe(0.95);
    expect(family.snippet).toBe("[[Bantou]]");
  });

  // @req REQ-002
  it("reports the corpus-wide family count rather than the page size", async () => {
    familiesPayload = {
      total: 7,
      rows: [familyRow("FLG_NIGER_CONGO", "Niger-Congo")],
    };

    const result = await ftsSearchEntities({ q: "er", limit: 1, offset: 0 });

    expect(result.familiesTotal).toBe(7);
    expect(result.families).toHaveLength(1);
    expect(result.total).toBe(7);
  });

  // @req REQ-002
  it("surfaces a family ranking failure instead of answering with an empty list", async () => {
    rpc.mockImplementation((fn: string) =>
      fn === "afrik_search_language_families"
        ? Promise.resolve({ data: null, error: { message: "families boom" } })
        : Promise.resolve({ data: { total: 0, rows: [] }, error: null })
    );

    await expect(
      ftsSearchEntities({ q: "bantou", limit: 20, offset: 0 })
    ).rejects.toMatchObject({ message: "families boom" });
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

  // REQ-126 AC1: a person published after human review, once indexed, is
  // findable via the unified search alongside the other natures.
  // @req REQ-126
  it("surfaces a published person whose name matches the query, ranked alongside other natures", async () => {
    personsPayload = {
      total: 1,
      rows: [
        personRow("PER_KEITA", "Modibo Keïta", {
          exactMatch: true,
          relevance: 0.9,
        }),
      ],
    };
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_BAMBARA", "Bambara")],
    };

    const result = await ftsSearchEntities({
      q: "Modibo Keïta",
      limit: 20,
      offset: 0,
    });

    expect(result.persons.map((p) => p.fullName)).toEqual(["Modibo Keïta"]);
    expect(result.personsTotal).toBe(1);
    expect(result.peoples.map((p) => p.nameMain)).toEqual(["Bambara"]);
    expect(result.total).toBe(2);
  });

  // REQ-126 AC1 continued: the RPC call, not a JS re-sort, is the ranking
  // authority — this only proves the query layer passes p_q/p_limit/p_offset
  // down and the RPC name is correct.
  // @req REQ-126
  it("calls afrik_search_persons with p_-prefixed named parameters", async () => {
    await ftsSearchEntities({ q: "keita", limit: 20, offset: 0 });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_persons",
      expect.objectContaining({ p_q: "keita", p_limit: 20, p_offset: 0 })
    );
  });

  // REQ-126 AC2: a person whose role is that of an observer of a people
  // (e.g. an ethnographer), linked via the inverse relation, carries that
  // link as its typed relation label — never as membership in the people.
  // @req REQ-126
  it("carries an ethnographer's link to a studied people as observation, never as membership", async () => {
    personsPayload = {
      total: 1,
      rows: [personRow("PER_DELAFOSSE", "Maurice Delafosse")],
    };
    personPeoplesRows = [
      {
        person_id: "PER_DELAFOSSE",
        people_id: "PPL_BAMBARA",
        relation_label: "observation",
      },
    ];
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_BAMBARA", "Bambara")],
    };

    const result = await ftsSearchEntities({
      q: "Delafosse",
      limit: 20,
      offset: 0,
    });

    const [person] = result.persons;
    expect(person.peopleLinks).toEqual([
      { peopleId: "PPL_BAMBARA", relationLabel: "observation" },
    ]);
    expect(person.peopleLinks[0].relationLabel).not.toBe("membership");
    // The observed people's own search result carries no trace of the
    // person — the relation is never collapsed into that people's
    // membership, it stays scoped to the person's own array.
    expect(result.peoples).toHaveLength(1);
    expect(result.peoples[0].id).toBe("PPL_BAMBARA");
  });

  // @req REQ-126
  it("reports zero persons and an empty array without querying person_peoples when nothing matches", async () => {
    const result = await ftsSearchEntities({
      q: "nonexistent",
      limit: 20,
      offset: 0,
    });

    expect(result.persons).toEqual([]);
    expect(result.personsTotal).toBe(0);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // REQ-135 AC1: a misspelling that shares a phonetic key with the canonical
  // name (dmetaphone, migration 066) still reaches it. The SQL function does
  // the phonetic matching; this only proves the query layer passes a
  // phonetic-only-matched row through untouched.
  // @req REQ-135
  it("surfaces a name reached only through a phonetic match", async () => {
    patronymesPayload = {
      total: 1,
      rows: [
        patronymeRow("PATR_KEITA", "Keïta", {
          relevance: 0.5,
          exactMatch: false,
        }),
      ],
    };

    const result = await ftsSearchEntities({
      q: "Keyta",
      limit: 20,
      offset: 0,
    });

    expect(result.patronymes.map((p) => p.nameMain)).toEqual(["Keïta"]);
    expect(result.patronymesTotal).toBe(1);
  });

  // REQ-135 AC2: an apostrophe in the query or the fiche never blocks a
  // match — afrik_unaccent (migration 066) folds it away on both sides.
  // @req REQ-135
  it("surfaces a name across an apostrophe difference between query and fiche", async () => {
    patronymesPayload = {
      total: 1,
      rows: [patronymeRow("PATR_ETOO", "Eto'o", { exactMatch: false })],
    };

    const result = await ftsSearchEntities({
      q: "Eto",
      limit: 20,
      offset: 0,
    });

    expect(result.patronymes.map((p) => p.nameMain)).toEqual(["Eto'o"]);
  });

  // REQ-135 AC3: a single-letter typo with no lexical or phonetic match
  // still reaches the name through the pg_trgm fallback (migration 066),
  // ranked below any lexical/phonetic match — the SQL function is the
  // ranking authority; this only proves the query layer passes the DB
  // order through untouched.
  // @req REQ-135
  it("keeps the database's ranking for names reached through the trigram fallback", async () => {
    patronymesPayload = {
      total: 2,
      rows: [
        patronymeRow("PATR_MASAMBA", "Masamba", { relevance: 0.4 }),
        patronymeRow("PATR_MAKALA", "Makala", { relevance: 0.32 }),
      ],
    };

    const result = await ftsSearchEntities({
      q: "Masambo",
      limit: 20,
      offset: 0,
    });

    expect(result.patronymes.map((p) => p.nameMain)).toEqual([
      "Masamba",
      "Makala",
    ]);
  });

  // REQ-135 AC4: an exact name match ranks first among names, ahead of any
  // lexical/phonetic/trigram-only match, mirroring the same rule already
  // proven for peoples and persons.
  // @req REQ-135
  it("ranks an exact name match first among names", async () => {
    patronymesPayload = {
      total: 2,
      rows: [
        patronymeRow("PATR_SONG", "Song", {
          relevance: 1,
          exactMatch: true,
        }),
        patronymeRow("PATR_SONGO", "Songo", {
          relevance: 0.4,
          exactMatch: false,
        }),
      ],
    };

    const result = await ftsSearchEntities({ q: "Song", limit: 20, offset: 0 });

    expect(result.patronymes.map((p) => p.nameMain)).toEqual(["Song", "Songo"]);
    expect(result.patronymes[0].exactMatch).toBe(true);
  });

  // @req REQ-135
  it("calls afrik_search_patronymes with p_-prefixed named parameters", async () => {
    await ftsSearchEntities({ q: "keita", limit: 20, offset: 0 });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_patronymes",
      expect.objectContaining({ p_q: "keita", p_limit: 20, p_offset: 0 })
    );
  });

  // @req REQ-135
  it("reports zero names and an empty array when nothing matches", async () => {
    const result = await ftsSearchEntities({
      q: "nonexistent",
      limit: 20,
      offset: 0,
    });

    expect(result.patronymes).toEqual([]);
    expect(result.patronymesTotal).toBe(0);
  });

  // @req REQ-135
  it("counts names in the corpus-wide total alongside the other natures", async () => {
    patronymesPayload = {
      total: 1,
      rows: [patronymeRow("PATR_KEITA", "Keïta", { exactMatch: true })],
    };
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_BAMBARA", "Bambara")],
    };

    const result = await ftsSearchEntities({
      q: "Keïta",
      limit: 20,
      offset: 0,
    });

    expect(result.total).toBe(2);
  });
  // ── quiz (ETNI-1709) ──────────────────────────────────────────────────────

  // @req REQ-121
  it("calls only afrik_search_quiz when the quiz lens is selected", async () => {
    await ftsSearchEntities({
      q: "wolof",
      limit: 20,
      offset: 0,
      lens: "quiz",
    });

    expect(rpc).toHaveBeenCalledWith("afrik_search_quiz", {
      p_q: "wolof",
      p_limit: 20,
      p_offset: 0,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  // @req REQ-121
  it("surfaces a quiz question through the name of the people it is about", async () => {
    quizPayload = {
      total: 1,
      rows: [
        quizRow("QZ_1", "Quel est l'autonyme des Wolof ?", {
          exactMatch: true,
          normalizedScore: 0.95,
          snippet: "[[Wolof]] · Quel est l'autonyme",
        }),
      ],
    };

    const result = await ftsSearchEntities({
      q: "Wolof",
      limit: 20,
      offset: 0,
      lens: "quiz",
    });

    expect(result.quizzes).toEqual([
      {
        id: "QZ_1",
        prompt: "Quel est l'autonyme des Wolof ?",
        entityType: "people",
        entityId: "PPL_WOLOF",
        subjectName: "Wolof",
        relevance: 0.5,
        exactMatch: true,
        normalizedScore: 0.95,
        snippet: "[[Wolof]] · Quel est l'autonyme",
      },
    ]);
    expect(result.quizzesTotal).toBe(1);
  });

  // REQ-121: the answer key never leaves the database through search. The
  // SQL projection is a closed list, but a row that somehow carried the
  // options or the explanation must still not reach a reader through this
  // mapping.
  // @req REQ-121
  it("never carries a quiz question's options, correct answer or explanation", async () => {
    quizPayload = {
      total: 1,
      rows: [
        quizRow("QZ_1", "Quel est l'autonyme des Wolof ?", {
          options_fr: ["Wolof", "Sérère", "Peul", "Diola"],
          correct_option: 0,
          explanation_fr: "Les Wolof se nomment eux-mêmes Wolof.",
        }),
      ],
    };

    const [quiz] = (
      await ftsSearchEntities({
        q: "Wolof",
        limit: 20,
        offset: 0,
        lens: "quiz",
      })
    ).quizzes;

    for (const leak of [
      "options_fr",
      "options",
      "correct_option",
      "correctOption",
      "explanation_fr",
      "explanation",
    ]) {
      expect(quiz).not.toHaveProperty(leak);
    }
  });

  // @req REQ-121
  it("keeps quiz questions out of the main search stream", async () => {
    quizPayload = {
      total: 9,
      rows: [quizRow("QZ_1", "Quel est l'autonyme des Wolof ?")],
    };
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_WOLOF", "Wolof")],
    };

    const result = await ftsSearchEntities({
      q: "Wolof",
      limit: 20,
      offset: 0,
    });

    expect(rpc).not.toHaveBeenCalledWith(
      "afrik_search_quiz",
      expect.anything()
    );
    expect(result.quizzes).toEqual([]);
    expect(result.quizzesTotal).toBe(0);
    expect(result.results.every((hit) => hit.kind !== "quiz")).toBe(true);
    expect(result.total).toBe(1);
  });

  // @req REQ-121
  it("returns only quiz hits and totals through the quiz lens", async () => {
    quizPayload = {
      total: 9,
      rows: [quizRow("QZ_1", "Quel est l'autonyme des Wolof ?")],
    };
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_WOLOF", "Wolof")],
    };

    const result = await ftsSearchEntities({
      q: "Wolof",
      limit: 20,
      offset: 0,
      lens: "quiz",
    });

    expect(result.quizzes).toHaveLength(1);
    expect(result.quizzesTotal).toBe(9);
    expect(result.results.map((hit) => hit.kind)).toEqual(["quiz"]);
    expect(result.peoples).toEqual([]);
    expect(result.countries).toEqual([]);
    expect(result.families).toEqual([]);
    expect(result.persons).toEqual([]);
    expect(result.patronymes).toEqual([]);
    expect(result.languages).toEqual([]);
    expect(result.peoplesTotal).toBe(0);
    expect(result.countriesTotal).toBe(0);
    expect(result.familiesTotal).toBe(0);
    expect(result.personsTotal).toBe(0);
    expect(result.patronymesTotal).toBe(0);
    expect(result.languagesTotal).toBe(0);
    expect(result.total).toBe(9);
  });

  // @req REQ-121
  it("surfaces a quiz ranking failure instead of answering with an empty list", async () => {
    rpc.mockImplementation((fn: string) =>
      fn === "afrik_search_quiz"
        ? Promise.resolve({ data: null, error: { message: "quiz boom" } })
        : Promise.resolve({ data: { total: 0, rows: [] }, error: null })
    );

    await expect(
      ftsSearchEntities({
        q: "Wolof",
        limit: 20,
        offset: 0,
        lens: "quiz",
      })
    ).rejects.toMatchObject({ message: "quiz boom" });
  });

  // ── languages (ETNI-1506) ─────────────────────────────────────────────────

  // REQ-136: a language name reaches the language fiche through the unified
  // search surface, not only the peoples that mention it.
  // @req REQ-136
  it("surfaces a language whose name matches the query", async () => {
    languagesPayload = {
      total: 1,
      rows: [languageRow("swa", "Swahili", { exactMatch: true })],
    };

    const result = await ftsSearchEntities({
      q: "Swahili",
      limit: 20,
      offset: 0,
    });

    expect(result.languages.map((l) => l.name)).toEqual(["Swahili"]);
    expect(result.languagesTotal).toBe(1);
    expect(result.languages[0].familyName).toBe("Niger-Congo");
  });

  // REQ-136 AC: "a language name — or an ISO code" — a reader who types the
  // ISO 639-3 id reaches the language exactly as precisely as one who types
  // its name. The SQL function (migration 068) does the ISO-code matching;
  // this only proves the query layer passes that row through untouched.
  // @req REQ-136
  it("surfaces a language matched by its ISO 639-3 code", async () => {
    languagesPayload = {
      total: 1,
      rows: [languageRow("swa", "Swahili", { exactMatch: true })],
    };

    const result = await ftsSearchEntities({ q: "swa", limit: 20, offset: 0 });

    expect(result.languages[0].id).toBe("swa");
    expect(result.languages[0].exactMatch).toBe(true);
  });

  // @req REQ-136
  it("calls afrik_search_languages with p_-prefixed named parameters", async () => {
    await ftsSearchEntities({ q: "swahili", limit: 20, offset: 0 });

    expect(rpc).toHaveBeenCalledWith(
      "afrik_search_languages",
      expect.objectContaining({ p_q: "swahili", p_limit: 20, p_offset: 0 })
    );
  });

  // @req REQ-136
  it("reports zero languages and an empty array when nothing matches", async () => {
    const result = await ftsSearchEntities({
      q: "nonexistent",
      limit: 20,
      offset: 0,
    });

    expect(result.languages).toEqual([]);
    expect(result.languagesTotal).toBe(0);
  });

  // @req REQ-136
  it("reports the corpus-wide language match count rather than the page size", async () => {
    languagesPayload = {
      total: 9,
      rows: [languageRow("swa", "Swahili"), languageRow("lin", "Lingala")],
    };

    const result = await ftsSearchEntities({ q: "a", limit: 2, offset: 0 });

    expect(result.languagesTotal).toBe(9);
    expect(result.languages).toHaveLength(2);
  });

  // REQ-136 AC: "Given a language name and a people name that match a query
  // equally well, when results are rendered, then both kinds are returned,
  // grouped by kind, and neither is silently dropped." Ranking between kinds
  // is the caller's job (exactMatch is the cross-kind sort key); this proves
  // the query layer itself never drops or merges one kind in favour of the
  // other.
  // @req REQ-136
  it("returns a language and a people that match equally well, grouped by kind, neither dropped", async () => {
    languagesPayload = {
      total: 1,
      rows: [languageRow("kon", "Kongo", { exactMatch: true, relevance: 1 })],
    };
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_KONGO", "Kongo", { exactMatch: true })],
    };

    const result = await ftsSearchEntities({
      q: "Kongo",
      limit: 20,
      offset: 0,
    });

    expect(result.languages.map((l) => l.name)).toEqual(["Kongo"]);
    expect(result.peoples.map((p) => p.nameMain)).toEqual(["Kongo"]);
    expect(result.languagesTotal).toBe(1);
    expect(result.peoplesTotal).toBe(1);
    expect(result.total).toBe(2);
  });

  // @req REQ-136
  it("counts languages in the reported total alongside the other natures", async () => {
    languagesPayload = {
      total: 1,
      rows: [languageRow("swa", "Swahili", { exactMatch: true })],
    };
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_BAMBARA", "Bambara")],
    };

    const result = await ftsSearchEntities({
      q: "Swahili",
      limit: 20,
      offset: 0,
    });

    expect(result.total).toBe(2);
  });

  // @req REQ-125
  it("fetches near-miss leads only when the combined total is zero", async () => {
    leadsPayload = {
      rows: [
        { kind: "people", id: "PPL_BAMBARA", name: "Bambara", similarity: 0.4 },
      ],
    };

    const result = await ftsSearchEntities({
      q: "bamba",
      limit: 20,
      offset: 0,
    });

    expect(result.total).toBe(0);
    expect(result.leads).toEqual([
      { kind: "people", id: "PPL_BAMBARA", name: "Bambara", similarity: 0.4 },
    ]);
    expect(rpc).toHaveBeenCalledWith("afrik_search_leads", {
      p_q: "bamba",
      p_limit: 3,
    });
  });

  // @req REQ-125
  it("never calls afrik_search_leads when a match already exists", async () => {
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_BAMBARA", "Bambara")],
    };

    const result = await ftsSearchEntities({
      q: "Bambara",
      limit: 20,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(result.leads).toEqual([]);
    expect(rpc).not.toHaveBeenCalledWith(
      "afrik_search_leads",
      expect.anything()
    );
  });

  // ETNI-1463 AC3 (ETNI-1744): a name query that resolves to nothing — no
  // patronyme hit and no hit in any other kind — still routes into the
  // REQ-125 near-miss surface, same as any other zero-hit query.
  // @req REQ-125
  it("routes a zero-hit name query into the near-miss leads surface", async () => {
    leadsPayload = {
      rows: [
        {
          kind: "people",
          id: "PPL_MANDINKA",
          name: "Mandinka",
          similarity: 0.3,
        },
      ],
    };

    const result = await ftsSearchEntities({
      q: "Keitaaa",
      limit: 20,
      offset: 0,
    });

    expect(result.patronymes).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.leads).toEqual([
      { kind: "people", id: "PPL_MANDINKA", name: "Mandinka", similarity: 0.3 },
    ]);
  });

  // @req REQ-125
  it("returns no leads when q is empty even with a relation scope and zero total", async () => {
    const result = await ftsSearchEntities({
      q: "",
      familyId: "FLG_KROU",
      limit: 20,
      offset: 0,
    });

    expect(result.total).toBe(0);
    expect(result.leads).toEqual([]);
    expect(rpc).not.toHaveBeenCalledWith(
      "afrik_search_leads",
      expect.anything()
    );
  });

  // ── the cross-kind ordered list (ETNI-1710) ───────────────────────────────

  // @req REQ-002
  it("orders every kind into one list by the score they share", async () => {
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_WOLOF", "Wolof", { normalizedScore: 0.97 })],
    };
    countriesPayload = {
      total: 1,
      rows: [countryRow("SEN", "Sénégal", { normalizedScore: 0.62 })],
    };
    familiesPayload = {
      total: 1,
      rows: [
        familyRow("FLG_ATLANTIQUE", "Atlantique", {
          normalizedScore: 0.55,
        }),
      ],
    };
    personsPayload = {
      total: 1,
      rows: [
        personRow("PER_DIOP", "Cheikh Anta Diop", {
          normalizedScore: 0.71,
        }),
      ],
    };
    patronymesPayload = {
      total: 1,
      rows: [patronymeRow("PATR_NDIAYE", "Ndiaye", { normalizedScore: 0.83 })],
    };
    const result = await ftsSearchEntities({
      q: "Wolof",
      limit: 20,
      offset: 0,
    });

    expect(result.results.map((hit) => [hit.kind, hit.id])).toEqual([
      ["people", "PPL_WOLOF"],
      ["patronyme", "PATR_NDIAYE"],
      ["person", "PER_DIOP"],
      ["country", "SEN"],
      ["languageFamily", "FLG_ATLANTIQUE"],
    ]);
  });

  // @req REQ-002
  it("breaks a tie between two kinds on the French name, then on the id", async () => {
    // Élé sorts before Epe in French collation and after it byte-wise, so a
    // plain string comparison would invert this pair.
    peoplesPayload = {
      total: 2,
      rows: [
        peopleRow("PPL_EPE", "Epe", { normalizedScore: 0.7 }),
        peopleRow("PPL_ELE_B", "Élé", { normalizedScore: 0.7 }),
      ],
    };
    countriesPayload = {
      total: 1,
      rows: [countryRow("ELE", "Élé", { normalizedScore: 0.7 })],
    };

    const result = await ftsSearchEntities({ q: "e", limit: 20, offset: 0 });

    expect(result.results.map((hit) => hit.id)).toEqual([
      "ELE",
      "PPL_ELE_B",
      "PPL_EPE",
    ]);
  });

  // @req REQ-135
  it("ranks a Manding and a Kongo name of equal evidential strength equally (AC1)", async () => {
    // Both fixtures sit at the same normalizedScore, standing in for equal
    // Source Tier confidence — the ranking has no region field to read, so
    // an equal score can only resolve by name, then id, never by origin.
    patronymesPayload = {
      total: 2,
      rows: [
        patronymeRow("PATR_KEITA", "Keïta", { normalizedScore: 0.8 }),
        patronymeRow("PATR_NZINGA", "Nzinga", { normalizedScore: 0.8 }),
      ],
    };

    const result = await ftsSearchEntities({ q: "name", limit: 20, offset: 0 });

    const patronymeHits = result.results.filter(
      (hit) => hit.kind === "patronyme"
    );
    expect(patronymeHits.map((hit) => hit.id)).toEqual([
      "PATR_KEITA",
      "PATR_NZINGA",
    ]);
    expect(patronymeHits[0].normalizedScore).toBe(
      patronymeHits[1].normalizedScore
    );
  });

  // @req REQ-002
  it("carries a name and a snippet on every row of the ordered list", async () => {
    peoplesPayload = {
      total: 1,
      rows: [
        peopleRow("PPL_WOLOF", "Wolof", {
          normalizedScore: 0.97,
          snippet: "[[Wolof]]",
        }),
      ],
    };
    const result = await ftsSearchEntities({
      q: "Wolof",
      limit: 20,
      offset: 0,
    });

    expect(result.results).toEqual([
      {
        kind: "people",
        id: "PPL_WOLOF",
        name: "Wolof",
        normalizedScore: 0.97,
        snippet: "[[Wolof]]",
      },
    ]);
  });

  // @req REQ-002
  it("keeps the grouped arrays and their totals alongside the ordered list", async () => {
    peoplesPayload = {
      total: 1,
      rows: [peopleRow("PPL_WOLOF", "Wolof", { normalizedScore: 0.9 })],
    };
    countriesPayload = {
      total: 1,
      rows: [countryRow("SEN", "Sénégal", { normalizedScore: 0.8 })],
    };

    const result = await ftsSearchEntities({
      q: "Wolof",
      limit: 20,
      offset: 0,
    });

    expect(result.peoples.map((p) => p.id)).toEqual(["PPL_WOLOF"]);
    expect(result.countries.map((c) => c.id)).toEqual(["SEN"]);
    expect(result.peoplesTotal).toBe(1);
    expect(result.countriesTotal).toBe(1);
    expect(result.results).toHaveLength(2);
  });
});

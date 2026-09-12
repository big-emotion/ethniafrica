import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  COUNTRY_FAMILY_PAGE_SIZE,
  getCountryLanguagesFact,
  getLanguageFamilyIdsByCountry,
} from "@/lib/supabase/queries/afrik/countryLanguageFamilies";
import { loadAllPeoples } from "@/lib/afrik/loaders/peopleLoader";
import { loadAllLanguages } from "@/lib/afrik/loaders/languageCsvLoader";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mockSupabase,
}));

/**
 * A `.select().order().order().range()` chain that serves the given pages in
 * order, one per `.range()` call — the shape PostgREST's client builds and the
 * only part of it this walk depends on.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tableChain(pages: Array<Array<Record<string, unknown>>>, error?: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = { select: vi.fn(), order: vi.fn(), range: vi.fn() };
  chain.select.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  let served = 0;
  chain.range.mockImplementation(() =>
    Promise.resolve({
      data: error ? null : (pages[served++] ?? []),
      error: error ?? null,
    })
  );
  return chain;
}

function mockCorpus(options: {
  peoples?: Array<Array<Record<string, unknown>>>;
  relations?: Array<Array<Record<string, unknown>>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  peoplesError?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  relationsError?: any;
}) {
  const peoples = tableChain(options.peoples ?? [[]], options.peoplesError);
  const relations = tableChain(
    options.relations ?? [[]],
    options.relationsError
  );
  mockSupabase.from.mockImplementation((table: string) =>
    table === "afrik_peoples" ? peoples : relations
  );
  return { peoples, relations };
}

function mockLanguageCorpus(options: {
  residences?: Array<Array<Record<string, unknown>>>;
  speakers?: Array<Array<Record<string, unknown>>>;
  languages?: Array<Array<Record<string, unknown>>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  speakersError?: any;
}) {
  const tables = {
    afrik_people_countries: tableChain(options.residences ?? [[]]),
    afrik_people_languages: tableChain(
      options.speakers ?? [[]],
      options.speakersError
    ),
    afrik_languages: tableChain(options.languages ?? [[]]),
  };
  mockSupabase.from.mockImplementation(
    (table: keyof typeof tables) => tables[table]
  );
  return tables;
}

const fullPeoplePage = (familyId: string) =>
  Array.from({ length: COUNTRY_FAMILY_PAGE_SIZE }, (_unused, index) => ({
    id: `PPL_${index}`,
    language_family_id: familyId,
  }));

describe("the language families a country holds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-116
  it("names every family whose peoples the corpus places in a country", async () => {
    mockCorpus({
      peoples: [
        [
          { id: "PPL_YOR", language_family_id: "FLG_NIGER_CONGO" },
          { id: "PPL_HAU", language_family_id: "FLG_AFRO_ASIATIQUE" },
          { id: "PPL_IGB", language_family_id: "FLG_NIGER_CONGO" },
        ],
      ],
      relations: [
        [
          { people_id: "PPL_YOR", country_id: "NGA" },
          { people_id: "PPL_HAU", country_id: "NGA" },
          { people_id: "PPL_IGB", country_id: "NGA" },
          { people_id: "PPL_YOR", country_id: "BEN" },
        ],
      ],
    });

    const familiesByCountry = await getLanguageFamilyIdsByCountry();

    expect(familiesByCountry.get("NGA")).toEqual([
      "FLG_AFRO_ASIATIQUE",
      "FLG_NIGER_CONGO",
    ]);
    expect(familiesByCountry.get("BEN")).toEqual(["FLG_NIGER_CONGO"]);
  });

  /**
   * Two of the corpus's peoples share a family in the same country far more
   * often than not — the filter asks whether a family is *present*, so the
   * second relation must not make the answer say it twice.
   */
  // @req REQ-116
  it("states a family once however many of its peoples the country holds", async () => {
    mockCorpus({
      peoples: [
        [
          { id: "PPL_A", language_family_id: "FLG_X" },
          { id: "PPL_B", language_family_id: "FLG_X" },
        ],
      ],
      relations: [
        [
          { people_id: "PPL_A", country_id: "TCD" },
          { people_id: "PPL_B", country_id: "TCD" },
        ],
      ],
    });

    expect((await getLanguageFamilyIdsByCountry()).get("TCD")).toEqual([
      "FLG_X",
    ]);
  });

  /**
   * The two silent ceilings of a Supabase read, both closed here: an unranged
   * select is capped at 1000 rows server-side with no error, and a `.range()`
   * without a total order pages over an undefined row order, which loses rows
   * and repeats others. The join table is 1618 rows on the recette corpus —
   * far enough past the cap that an unranged walk would drop a third of it.
   */
  // @req REQ-110
  it("walks each table by explicit range, under a total order", async () => {
    const { peoples, relations } = mockCorpus({
      peoples: [
        fullPeoplePage("FLG_X"),
        [{ id: "PPL_Z", language_family_id: "FLG_Y" }],
      ],
      relations: [[{ people_id: "PPL_Z", country_id: "MLI" }]],
    });

    await getLanguageFamilyIdsByCountry();

    expect(peoples.select).toHaveBeenCalledWith("id, language_family_id");
    expect(peoples.order).toHaveBeenCalledWith("id");
    expect(peoples.range).toHaveBeenNthCalledWith(
      1,
      0,
      COUNTRY_FAMILY_PAGE_SIZE - 1
    );
    expect(peoples.range).toHaveBeenNthCalledWith(
      2,
      COUNTRY_FAMILY_PAGE_SIZE,
      COUNTRY_FAMILY_PAGE_SIZE * 2 - 1
    );

    expect(relations.select).toHaveBeenCalledWith("people_id, country_id");
    expect(relations.order).toHaveBeenCalledWith("people_id");
    expect(relations.order).toHaveBeenCalledWith("country_id");
  });

  // @req REQ-110
  it("stops at the first short page rather than reading past the corpus", async () => {
    const { peoples } = mockCorpus({
      peoples: [[{ id: "PPL_A", language_family_id: "FLG_X" }]],
      relations: [[{ people_id: "PPL_A", country_id: "GHA" }]],
    });

    await getLanguageFamilyIdsByCountry();

    expect(peoples.range).toHaveBeenCalledTimes(1);
  });

  /**
   * A people the corpus has not classified belongs to no family, and inventing
   * a bucket for it would put an option in the filter that names nothing a
   * reader could look up.
   */
  // @req REQ-116
  it("leaves an unclassified people out rather than filing it under a family", async () => {
    mockCorpus({
      peoples: [
        [
          { id: "PPL_A", language_family_id: null },
          { id: "PPL_B", language_family_id: "" },
          { id: "PPL_C", language_family_id: "FLG_X" },
        ],
      ],
      relations: [
        [
          { people_id: "PPL_A", country_id: "SOM" },
          { people_id: "PPL_B", country_id: "SOM" },
          { people_id: "PPL_C", country_id: "SOM" },
        ],
      ],
    });

    expect((await getLanguageFamilyIdsByCountry()).get("SOM")).toEqual([
      "FLG_X",
    ]);
  });

  // @req REQ-110
  it("throws rather than answering from a half-walked corpus", async () => {
    mockCorpus({ peoplesError: { message: "boom" } });

    await expect(getLanguageFamilyIdsByCountry()).rejects.toBeTruthy();
  });

  // @req REQ-119
  it("rejects a fold when every permitted page is full", async () => {
    mockCorpus({
      peoples: Array.from({ length: 40 }, () => fullPeoplePage("FLG_X")),
    });

    await expect(getLanguageFamilyIdsByCountry()).rejects.toThrow(
      /exceeded 40 pages/
    );
  });
});

describe("the languages a country holds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-119
  it("returns seven named languages for Burundi from the current corpus", async () => {
    const peoples = await loadAllPeoples();
    const residents = peoples.filter((people) =>
      people.currentCountries?.includes("BDI")
    );
    const codes = new Set(
      residents.flatMap((people) => people.content.languages?.isoCodes ?? [])
    );
    const languages = loadAllLanguages(peoples).filter((language) =>
      codes.has(language.id)
    );
    mockLanguageCorpus({
      residences: [
        residents.map((people) => ({
          people_id: people.id,
          country_id: "BDI",
        })),
      ],
      speakers: [
        residents.flatMap((people) =>
          (people.content.languages?.isoCodes ?? []).map((language_id) => ({
            people_id: people.id,
            language_id,
          }))
        ),
      ],
      languages: [
        languages.map((language) => ({
          id: language.id,
          name: language.name,
          content: { nameProvenance: language.nameProvenance },
        })),
      ],
    });

    const fact = await getCountryLanguagesFact("BDI");

    expect(fact.provenance).toBe("derived");
    expect(fact.value).toHaveLength(7);
    expect(fact.from?.length).toBeGreaterThan(0);
  });

  // @req REQ-119
  it("keeps the country's declared languages without reading any join table", async () => {
    const fact = await getCountryLanguagesFact("BDI", ["Kirundi", "français"]);

    expect(fact).toEqual({
      value: ["Kirundi", "français"],
      provenance: "declared",
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // @req REQ-119
  it("derives Burundi's languages through its resident peoples and names their ids", async () => {
    mockLanguageCorpus({
      residences: [
        [
          { people_id: "PPL_HUTU_BURUNDI", country_id: "BDI" },
          { people_id: "PPL_TUTSI_BURUNDI", country_id: "BDI" },
          { people_id: "PPL_TWA", country_id: "BDI" },
          { people_id: "PPL_HUTU_BURUNDI", country_id: "RWA" },
          { people_id: "PPL_YORUBA", country_id: "NGA" },
        ],
      ],
      speakers: [
        [
          { people_id: "PPL_HUTU_BURUNDI", language_id: "run" },
          { people_id: "PPL_TUTSI_BURUNDI", language_id: "run" },
          { people_id: "PPL_TWA", language_id: "run" },
          { people_id: "PPL_YORUBA", language_id: "yor" },
        ],
      ],
      languages: [
        [
          { id: "run", name: "Kirundi" },
          { id: "yor", name: "Yorùbá" },
        ],
      ],
    });

    expect(await getCountryLanguagesFact("BDI")).toEqual({
      value: ["Kirundi"],
      provenance: "derived",
      from: ["PPL_HUTU_BURUNDI", "PPL_TUTSI_BURUNDI", "PPL_TWA"],
    });
  });

  // @req REQ-119
  it("walks every relation and name table by an explicit, ordered range", async () => {
    const filler = Array.from(
      { length: COUNTRY_FAMILY_PAGE_SIZE },
      (_, index) => ({ people_id: `PPL_${index}`, country_id: "NGA" })
    );
    const tables = mockLanguageCorpus({
      residences: [filler, [{ people_id: "PPL_LAST", country_id: "BDI" }]],
      speakers: [[{ people_id: "PPL_LAST", language_id: "run" }]],
      languages: [[{ id: "run", name: "Kirundi" }]],
    });

    expect(await getCountryLanguagesFact("BDI")).toEqual({
      value: ["Kirundi"],
      provenance: "derived",
      from: ["PPL_LAST"],
    });
    expect(tables.afrik_people_countries.range).toHaveBeenNthCalledWith(
      2,
      COUNTRY_FAMILY_PAGE_SIZE,
      COUNTRY_FAMILY_PAGE_SIZE * 2 - 1
    );
    expect(tables.afrik_people_languages.range).toHaveBeenCalledWith(
      0,
      COUNTRY_FAMILY_PAGE_SIZE - 1
    );
    expect(tables.afrik_languages.range).toHaveBeenCalledWith(
      0,
      COUNTRY_FAMILY_PAGE_SIZE - 1
    );
    expect(tables.afrik_people_countries.order).toHaveBeenCalledWith(
      "people_id"
    );
    expect(tables.afrik_people_languages.order).toHaveBeenCalledWith(
      "people_id"
    );
    expect(tables.afrik_languages.order).toHaveBeenCalledWith("id");
  });

  // @req REQ-119
  it("reports missing when no speaking people links the country to a named language", async () => {
    mockLanguageCorpus({
      residences: [[{ people_id: "PPL_TWA", country_id: "BDI" }]],
      speakers: [[]],
      languages: [[]],
    });

    expect(await getCountryLanguagesFact("BDI", [])).toEqual({
      value: [],
      provenance: "missing",
    });
  });

  // @req REQ-119
  it("rejects a failed join walk instead of returning a partial fact", async () => {
    mockLanguageCorpus({
      residences: [[{ people_id: "PPL_TWA", country_id: "BDI" }]],
      speakersError: { message: "boom" },
    });

    await expect(getCountryLanguagesFact("BDI")).rejects.toBeTruthy();
  });
});

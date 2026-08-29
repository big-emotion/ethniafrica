import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  COUNTRY_FAMILY_PAGE_SIZE,
  getLanguageFamilyIdsByCountry,
} from "@/lib/supabase/queries/afrik/countryLanguageFamilies";

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
});

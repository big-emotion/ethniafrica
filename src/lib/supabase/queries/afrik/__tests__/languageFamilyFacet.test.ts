import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  FAMILY_FACET_PAGE_SIZE,
  countUnclassifiedPeoples,
  getCountryIdsByLanguageFamily,
} from "@/lib/supabase/queries/afrik/languageFamilyFacet";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mockSupabase,
}));

/**
 * Serves successive `.range()` pages per table, so a walk that stops early or
 * forgets its range is visible rather than merely under-counted.
 */
function mockTableWalks(
  pagesByTable: Record<string, Array<Array<Record<string, unknown>>>>
) {
  const chains: Record<
    string,
    { select: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> }
  > = {};

  mockSupabase.from.mockImplementation((table: string) => {
    if (!chains[table]) {
      let served = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = { select: vi.fn(), range: vi.fn() };
      chain.select.mockReturnValue(chain);
      chain.range.mockImplementation(() =>
        Promise.resolve({
          data: pagesByTable[table]?.[served++] ?? [],
          error: null,
        })
      );
      chains[table] = chain;
    }
    return chains[table];
  });

  return chains;
}

describe("getCountryIdsByLanguageFamily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-117
  it("resolves each family's countries through the peoples that carry its id", async () => {
    mockTableWalks({
      afrik_peoples: [
        [
          { id: "PPL_SHONA", language_family_id: "FLG_BANTU" },
          { id: "PPL_SOMALI", language_family_id: "FLG_COUCHITIQUE" },
        ],
      ],
      afrik_people_countries: [
        [
          { people_id: "PPL_SHONA", country_id: "ZWE" },
          { people_id: "PPL_SHONA", country_id: "MOZ" },
          { people_id: "PPL_SOMALI", country_id: "SOM" },
        ],
      ],
    });

    const presence = await getCountryIdsByLanguageFamily();

    expect(presence.get("FLG_BANTU")).toEqual(["MOZ", "ZWE"]);
    expect(presence.get("FLG_COUCHITIQUE")).toEqual(["SOM"]);
  });

  // @req REQ-117
  it("names a country once however many of a family's peoples live there", async () => {
    mockTableWalks({
      afrik_peoples: [
        [
          { id: "PPL_SHONA", language_family_id: "FLG_BANTU" },
          { id: "PPL_ZULU", language_family_id: "FLG_BANTU" },
        ],
      ],
      afrik_people_countries: [
        [
          { people_id: "PPL_SHONA", country_id: "ZAF" },
          { people_id: "PPL_ZULU", country_id: "ZAF" },
        ],
      ],
    });

    const presence = await getCountryIdsByLanguageFamily();

    expect(presence.get("FLG_BANTU")).toEqual(["ZAF"]);
  });

  /**
   * Afro-asiatique's peoples all carry a sub-family's id, so it reaches no
   * country through this derivation. That is a fact of the corpus: the family
   * must be absent from the map rather than invented onto it.
   */
  // @req REQ-117
  it("leaves a family whose peoples all sit under a sub-family out of the presence map", async () => {
    mockTableWalks({
      afrik_peoples: [
        [{ id: "PPL_SOMALI", language_family_id: "FLG_COUCHITIQUE" }],
      ],
      afrik_people_countries: [
        [{ people_id: "PPL_SOMALI", country_id: "SOM" }],
      ],
    });

    const presence = await getCountryIdsByLanguageFamily();

    expect(presence.has("FLG_AFROASIATIQUE")).toBe(false);
  });

  // @req REQ-110
  it("walks both tables with an explicit range, which an unranged select would let PostgREST silently cap", async () => {
    const fullPeoplePage = Array.from(
      { length: FAMILY_FACET_PAGE_SIZE },
      (_, index) => ({
        id: `PPL_${index}`,
        language_family_id: "FLG_BANTU",
      })
    );

    const chains = mockTableWalks({
      afrik_peoples: [
        fullPeoplePage,
        [{ id: "PPL_LAST", language_family_id: "FLG_MANDE" }],
      ],
      afrik_people_countries: [[{ people_id: "PPL_LAST", country_id: "MLI" }]],
    });

    const presence = await getCountryIdsByLanguageFamily();

    expect(chains.afrik_peoples.range).toHaveBeenNthCalledWith(
      1,
      0,
      FAMILY_FACET_PAGE_SIZE - 1
    );
    expect(chains.afrik_peoples.range).toHaveBeenNthCalledWith(
      2,
      FAMILY_FACET_PAGE_SIZE,
      FAMILY_FACET_PAGE_SIZE * 2 - 1
    );
    expect(chains.afrik_people_countries.range).toHaveBeenCalledWith(
      0,
      FAMILY_FACET_PAGE_SIZE - 1
    );
    expect(presence.get("FLG_MANDE")).toEqual(["MLI"]);
  });

  // @req REQ-110
  it("stops at the first short page instead of querying past the end of a table", async () => {
    const chains = mockTableWalks({
      afrik_peoples: [[{ id: "PPL_SHONA", language_family_id: "FLG_BANTU" }]],
      afrik_people_countries: [[{ people_id: "PPL_SHONA", country_id: "ZWE" }]],
    });

    await getCountryIdsByLanguageFamily();

    expect(chains.afrik_peoples.range).toHaveBeenCalledTimes(1);
    expect(chains.afrik_people_countries.range).toHaveBeenCalledTimes(1);
  });
});

describe("countUnclassifiedPeoples", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * A head-only count chain. `.select()` already resolves — that is the
   * whole-table case — and also carries `.or`, which is how PostgREST lets a
   * filter be appended to a query that is otherwise ready to run.
   */
  function mockCountQuery(count: number) {
    const settled = { count, error: null };
    const or = vi.fn().mockResolvedValue(settled);
    const select = vi
      .fn()
      .mockReturnValue(Object.assign(Promise.resolve(settled), { or }));

    mockSupabase.from.mockReturnValue({ select });
    return { select, or };
  }

  /**
   * The count that used to be a subtraction over the page on screen. Asking
   * Postgres for it is what makes it a measure of the corpus: no rows travel,
   * so the 1000-row ceiling that truncates a row walk cannot reach it.
   */
  // @req REQ-108
  it("asks Postgres for a head-only exact count rather than counting rows it fetched", async () => {
    const chain = mockCountQuery(64);

    const count = await countUnclassifiedPeoples(["FLG_BANTU", "FLG_MANDE"]);

    expect(mockSupabase.from).toHaveBeenCalledWith("afrik_peoples");
    expect(chain.select).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });
    expect(count).toBe(64);
  });

  // @req REQ-108
  it("counts a people with no family and a people pointing at an unpublished one alike", async () => {
    const chain = mockCountQuery(64);

    await countUnclassifiedPeoples(["FLG_BANTU", "FLG_MANDE"]);

    expect(chain.or).toHaveBeenCalledWith(
      'language_family_id.is.null,language_family_id.not.in.("FLG_BANTU","FLG_MANDE")'
    );
  });

  // @req REQ-108
  it("counts every people when the roster of published families is empty", async () => {
    const chain = mockCountQuery(789);

    const count = await countUnclassifiedPeoples([]);

    expect(chain.or).not.toHaveBeenCalled();
    expect(count).toBe(789);
  });

  /**
   * An id carrying a comma or a quote would end the PostgREST list early and
   * silently widen the count. Dropping it narrows instead, which is the safe
   * direction, and the log says a family is being left out.
   */
  // @req REQ-108
  it("drops an identifier that would break out of the PostgREST list", async () => {
    const chain = mockCountQuery(3);

    await countUnclassifiedPeoples(['FLG_BANTU", "x', "FLG_MANDE"]);

    expect(chain.or).toHaveBeenCalledWith(
      'language_family_id.is.null,language_family_id.not.in.("FLG_MANDE")'
    );
  });
});

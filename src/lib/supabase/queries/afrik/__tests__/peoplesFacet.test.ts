import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  PEOPLE_FACET_WALK_SIZE,
  getAfrikPeopleCountryIndex,
  getAfrikPeopleIdsInCountry,
  getPaginatedAfrikPeoples,
} from "../peoples";
import { createServerClient } from "../../../server";

/**
 * The two reads the peoples facet of the Explorer hub is built on.
 *
 * Both exist because of the same defect: `afrikLoader.getPeoples` fetched a
 * page of twenty and then dropped the rows whose `currentCountries` did not
 * contain the chosen country. Page one of a country filter was therefore
 * "whichever of the first twenty peoples happen to be Ghanaian", and the total
 * it reported alongside was the total of everything. These assertions are about
 * where the narrowing happens, not about what it returns.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A PostgREST builder stub whose terminal `.range()` serves the given pages in order. */
function builder(pages: Array<{ data: unknown[]; count?: number }>) {
  const chain: any = {};
  for (const method of ["select", "eq", "in", "ilike", "textSearch", "order"]) {
    chain[method] = vi.fn(() => chain);
  }
  let served = 0;
  chain.range = vi.fn(() => {
    const page = pages[served++] ?? { data: [] };
    return Promise.resolve({
      data: page.data,
      error: null,
      count: page.count ?? page.data.length,
    });
  });
  return chain;
}

function serveTables(tables: Record<string, any>) {
  const supabase = {
    from: vi.fn((table: string) => tables[table]),
  };
  vi.mocked(createServerClient).mockReturnValue(supabase as any);
  return supabase;
}

const relationRows = (peopleIds: string[]) =>
  peopleIds.map((people_id) => ({ people_id }));

describe("the peoples a country holds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-110
  it("walks the join table with an explicit range, which an unranged select lets PostgREST silently cap", async () => {
    const full = relationRows(
      Array.from({ length: PEOPLE_FACET_WALK_SIZE }, (_, i) => `PPL_${i}`)
    );
    const relations = builder([
      { data: full },
      { data: relationRows(["PPL_Z"]) },
    ]);
    serveTables({ afrik_people_countries: relations });

    const ids = await getAfrikPeopleIdsInCountry("GHA");

    expect(relations.eq).toHaveBeenCalledWith("country_id", "GHA");
    expect(relations.range).toHaveBeenNthCalledWith(
      1,
      0,
      PEOPLE_FACET_WALK_SIZE - 1
    );
    expect(relations.range).toHaveBeenNthCalledWith(
      2,
      PEOPLE_FACET_WALK_SIZE,
      PEOPLE_FACET_WALK_SIZE * 2 - 1
    );
    expect(ids).toHaveLength(PEOPLE_FACET_WALK_SIZE + 1);
    expect(ids[ids.length - 1]).toBe("PPL_Z");
  });

  // @req REQ-110
  it("stops at the first short page instead of reading past the end of the table", async () => {
    const relations = builder([{ data: relationRows(["PPL_AKAN"]) }]);
    serveTables({ afrik_people_countries: relations });

    await getAfrikPeopleIdsInCountry("GHA");

    expect(relations.range).toHaveBeenCalledTimes(1);
  });
});

describe("a page of the peoples facet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-110
  it("asks the database for the country's peoples instead of narrowing the page it loaded", async () => {
    const relations = builder([
      { data: relationRows(["PPL_AKAN", "PPL_EWE"]) },
    ]);
    const peoples = builder([
      {
        data: [
          {
            id: "PPL_AKAN",
            name_main: "Akan",
            language_family_id: "FLG_NIGER_CONGO",
            content: {},
            afrik_people_countries: [{ country_id: "GHA" }],
          },
        ],
        count: 2,
      },
    ]);
    serveTables({
      afrik_people_countries: relations,
      afrik_peoples: peoples,
    });

    const result = await getPaginatedAfrikPeoples(1, 20, { countryId: "GHA" });

    expect(peoples.in).toHaveBeenCalledWith("id", ["PPL_AKAN", "PPL_EWE"]);
    expect(peoples.range).toHaveBeenCalledWith(0, 19);
    // The count comes back from the narrowed query, so the pager describes the
    // set on screen rather than the whole corpus.
    expect(result.total).toBe(2);
    expect(result.data.map((people) => people.id)).toEqual(["PPL_AKAN"]);
  });

  // @req REQ-110
  it("reports an empty page for a country the corpus documents nobody in, without guessing at the whole corpus", async () => {
    const relations = builder([{ data: [] }]);
    const peoples = builder([{ data: [], count: 789 }]);
    serveTables({
      afrik_people_countries: relations,
      afrik_peoples: peoples,
    });

    const result = await getPaginatedAfrikPeoples(1, 20, { countryId: "ATA" });

    expect(result).toEqual({ data: [], total: 0 });
    expect(peoples.range).not.toHaveBeenCalled();
  });
});

describe("the country index the peoples facet publishes to the map", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-117
  it("covers the whole filtered set, not the page the reader is on", async () => {
    const firstPage = Array.from(
      { length: PEOPLE_FACET_WALK_SIZE },
      (_, index) => ({
        id: `PPL_${index}`,
        name_main: `Peuple ${index}`,
        afrik_people_countries: [{ country_id: "TZA" }],
      })
    );
    const peoples = builder([
      { data: firstPage },
      {
        data: [
          {
            id: "PPL_ZULU",
            name_main: "Zulu",
            afrik_people_countries: [
              { country_id: "ZAF" },
              { country_id: "ZWE" },
            ],
          },
        ],
      },
    ]);
    serveTables({ afrik_peoples: peoples });

    const index = await getAfrikPeopleCountryIndex();

    expect(peoples.range).toHaveBeenCalledTimes(2);
    expect(index).toHaveLength(PEOPLE_FACET_WALK_SIZE + 1);
    expect(index[index.length - 1]).toEqual({
      id: "PPL_ZULU",
      nameMain: "Zulu",
      countryIds: ["ZAF", "ZWE"],
    });
  });

  // @req REQ-117
  it("carries the reader's filters into the query rather than into a second pass over the rows", async () => {
    const peoples = builder([{ data: [] }]);
    serveTables({ afrik_peoples: peoples });

    await getAfrikPeopleCountryIndex({
      languageFamilyId: "FLG_BANTU",
      initialLetter: "Z",
    });

    expect(peoples.eq).toHaveBeenCalledWith("language_family_id", "FLG_BANTU");
    expect(peoples.ilike).toHaveBeenCalledWith("name_main", "Z%");
  });

  // @req REQ-117
  it("resolves a country filter to people ids before querying, never after", async () => {
    const relations = builder([{ data: relationRows(["PPL_AKAN"]) }]);
    const peoples = builder([
      {
        data: [
          {
            id: "PPL_AKAN",
            name_main: "Akan",
            afrik_people_countries: [{ country_id: "GHA" }],
          },
        ],
      },
    ]);
    serveTables({
      afrik_people_countries: relations,
      afrik_peoples: peoples,
    });

    const index = await getAfrikPeopleCountryIndex({ countryId: "GHA" });

    expect(peoples.in).toHaveBeenCalledWith("id", ["PPL_AKAN"]);
    expect(index).toEqual([
      { id: "PPL_AKAN", nameMain: "Akan", countryIds: ["GHA"] },
    ]);
  });

  // @req REQ-117
  it("returns nothing, and reads no peoples at all, for a country with no documented people", async () => {
    const relations = builder([{ data: [] }]);
    const peoples = builder([{ data: [{ id: "PPL_AKAN" }] }]);
    serveTables({
      afrik_people_countries: relations,
      afrik_peoples: peoples,
    });

    expect(await getAfrikPeopleCountryIndex({ countryId: "ATA" })).toEqual([]);
    expect(peoples.range).not.toHaveBeenCalled();
  });
});

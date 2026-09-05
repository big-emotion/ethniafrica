/**
 * Test-first: what the name facet of the atlas hub reads (REQ-139, REQ-133).
 *
 * The name axis has had an index since ETNI-1803, and no way to narrow it:
 * `listPatronymes` took a page and a size and nothing else, so a reader asking
 * "which names do the Bamana carry" had thirty rows and no control. This is the
 * `peoplesFacet` trio applied to that axis — one service answering the three
 * questions one screen asks together, so the list and the globe panel are never
 * narrowed by two different notions of the current selection.
 *
 * Every case here mocks Supabase. Nothing in this file needs a database, which
 * is the point of shipping the service before the page.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  getPatronymesFacetChoices,
  getPatronymesFacetCountryIndex,
  getPatronymesFacetPage,
  PATRONYMES_FACET_PAGE_SIZES,
  PATRONYMES_FACET_PER_PAGE,
} from "../patronymesFacet";

type Call = [string, unknown[]];

/** A chainable PostgREST double that records what the service asked for. */
function buildChain(result: unknown, calls: Call[]) {
  const query: Record<string, unknown> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, args]);
      return query;
    };

  for (const method of ["select", "order", "textSearch", "ilike", "eq", "in"]) {
    query[method] = vi.fn(record(method));
  }
  query.range = vi.fn((...args: unknown[]) => {
    calls.push(["range", args]);
    return Promise.resolve(result);
  });
  // The real builder is thenable, so a chain that ends on `.in()` or `.eq()`
  // resolves without a terminal call. A double that only resolves on `.range()`
  // silently hands back the builder itself, and the service reads `undefined`
  // where the corpus had rows.
  query.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return query;
}

const nameRow = (id: string, nameMain: string) => ({
  id,
  content: { nameMain },
  name_system: "clan_name",
});

beforeEach(() => {
  fromMock.mockReset();
});

describe("name facet — one page, narrowed at the database", () => {
  // @req REQ-139
  it("orders by the name a reader reads, not by the corpus identifier", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation(() =>
      buildChain({ data: [nameRow("PAT_KEITA", "Keïta")], count: 1 }, calls)
    );

    await getPatronymesFacetPage(1, {
      nameSystem: null,
      peopleId: null,
      countryId: null,
      letter: null,
    });

    expect(calls).toContainEqual(["order", ["name_main"]]);
    expect(calls).not.toContainEqual(["order", ["id"]]);
  });

  // @req REQ-139
  it("answers a page past the end with the last one, total unmoved", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation(() =>
      buildChain({ data: [nameRow("PAT_KEITA", "Keïta")], count: 30 }, calls)
    );

    const result = await getPatronymesFacetPage(
      9,
      { nameSystem: null, peopleId: null, countryId: null, letter: null },
      24
    );

    expect(result.page).toBe(2);
    expect(result.total).toBe(30);
    expect(result.totalPages).toBe(2);
  });

  // @req REQ-135
  it("searches the name vector rather than scanning the page", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation(() =>
      buildChain({ data: [], count: 0 }, calls)
    );

    await getPatronymesFacetPage(1, {
      nameSystem: null,
      peopleId: null,
      countryId: null,
      letter: null,
      search: "keita",
    });

    const search = calls.find(([name]) => name === "textSearch");
    expect(search?.[1][0]).toBe("search_vector");
  });
});

describe("name facet — the page size is an allowlist, not a number", () => {
  /**
   * The size becomes a `.range()` on a database query, so an arbitrary value
   * from the address bar would let an anonymous request ask for the whole
   * corpus in one page. And the default has to be the first entry, because
   * that is the contract `resolvePageSize` falls back on when a request names
   * a size the facet does not offer.
   */
  // @req REQ-139
  it("offers its default first and nothing a reader cannot scan", () => {
    expect(PATRONYMES_FACET_PAGE_SIZES[0]).toBe(PATRONYMES_FACET_PER_PAGE);
    expect(Math.max(...PATRONYMES_FACET_PAGE_SIZES)).toBeLessThanOrEqual(100);
  });
});

describe("name facet — a relation filter resolves before the list", () => {
  // @req REQ-139
  it("narrows to the names a people carries", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation((table: string) => {
      if (table === "afrik_patronyme_peoples") {
        return buildChain(
          { data: [{ patronyme_id: "PAT_KEITA" }], error: null },
          calls
        );
      }
      return buildChain(
        { data: [nameRow("PAT_KEITA", "Keïta")], count: 1 },
        calls
      );
    });

    await getPatronymesFacetPage(1, {
      nameSystem: null,
      peopleId: "PPL_BAMANA",
      countryId: null,
      letter: null,
    });

    expect(calls).toContainEqual(["in", ["id", ["PAT_KEITA"]]]);
  });

  // @req REQ-139
  it("intersects a people and a country rather than applying the last one", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation((table: string) => {
      if (table === "afrik_patronyme_peoples") {
        return buildChain(
          {
            data: [
              { patronyme_id: "PAT_KEITA" },
              { patronyme_id: "PAT_DIALLO" },
            ],
            error: null,
          },
          calls
        );
      }
      if (table === "afrik_patronyme_countries") {
        return buildChain(
          {
            data: [
              { patronyme_id: "PAT_DIALLO" },
              { patronyme_id: "PAT_BAMBA" },
            ],
            error: null,
          },
          calls
        );
      }
      return buildChain({ data: [], count: 0 }, calls);
    });

    await getPatronymesFacetPage(1, {
      nameSystem: null,
      peopleId: "PPL_BAMANA",
      countryId: "MLI",
      letter: null,
    });

    expect(calls).toContainEqual(["in", ["id", ["PAT_DIALLO"]]]);
  });

  /**
   * "No filter" and "a filter nothing satisfies" must not collapse: PostgREST
   * rejects `in.()`, and falling through to the unfiltered query would serve
   * all thirty names under that country's name.
   */
  // @req REQ-139
  it("returns nothing for a country the corpus documents no name in", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation((table: string) => {
      if (table === "afrik_patronyme_countries") {
        return buildChain({ data: [], error: null }, calls);
      }
      return buildChain(
        { data: [nameRow("PAT_KEITA", "Keïta")], count: 30 },
        calls
      );
    });

    const result = await getPatronymesFacetPage(1, {
      nameSystem: null,
      peopleId: null,
      countryId: "ZWE",
      letter: null,
    });

    expect(result.patronymes).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("name facet — what the reader may narrow to", () => {
  // @req REQ-139
  it("offers only the peoples and countries the corpus links a name to", async () => {
    fromMock.mockImplementation((table: string) => {
      const calls: Call[] = [];
      if (table === "afrik_patronyme_peoples") {
        return buildChain(
          { data: [{ people_id: "PPL_BAMANA" }], error: null },
          calls
        );
      }
      if (table === "afrik_patronyme_countries") {
        return buildChain(
          { data: [{ country_id: "MLI" }], error: null },
          calls
        );
      }
      if (table === "afrik_peoples") {
        // The row shape the corpus actually has. `content` carries no
        // `nameMain` on any of the 790 fiches — the name is the `name_main`
        // column — so a double that supplied one had the label resolve in the
        // test and fall back to the raw `PPL_*` id on the page.
        return buildChain(
          {
            data: [{ id: "PPL_BAMANA", name_main: "Bamana" }],
            error: null,
          },
          calls
        );
      }
      if (table === "afrik_countries") {
        return buildChain(
          { data: [{ id: "MLI", name_fr: "Mali" }], error: null },
          calls
        );
      }
      return buildChain(
        { data: [{ name_system: "clan_name" }], error: null },
        calls
      );
    });

    const choices = await getPatronymesFacetChoices();

    expect(choices.peoples).toEqual([{ id: "PPL_BAMANA", label: "Bamana" }]);
    expect(choices.countries).toEqual([{ id: "MLI", label: "Mali" }]);
    // The label is French by contract: the endpoint has no locale parameter,
    // and the glossary keying the vocabulary by locale must not change what
    // this payload says.
    expect(choices.nameSystems).toEqual([
      { id: "clan_name", label: "Nom de clan" },
    ]);
  });

  // @req REQ-139
  it("asks afrik_peoples for the name column rather than the whole fiche", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation((table: string) => {
      if (table === "afrik_peoples") {
        return buildChain(
          { data: [{ id: "PPL_BAMANA", name_main: "Bamana" }], error: null },
          calls
        );
      }
      if (table === "afrik_patronyme_peoples") {
        return buildChain({ data: [{ people_id: "PPL_BAMANA" }] }, calls);
      }
      return buildChain({ data: [], error: null }, calls);
    });

    await getPatronymesFacetChoices();

    const peopleSelect = calls.find(
      ([method, args]) => method === "select" && args[0] === "id, name_main"
    );
    expect(peopleSelect).toBeDefined();
  });

  // @req REQ-139
  it("falls back to the identifier only when the corpus names nothing", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation((table: string) => {
      if (table === "afrik_peoples") {
        return buildChain(
          { data: [{ id: "PPL_UNNAMED", name_main: null }], error: null },
          calls
        );
      }
      if (table === "afrik_patronyme_peoples") {
        return buildChain({ data: [{ people_id: "PPL_UNNAMED" }] }, calls);
      }
      return buildChain({ data: [], error: null }, calls);
    });

    const choices = await getPatronymesFacetChoices();

    expect(choices.peoples).toEqual([
      { id: "PPL_UNNAMED", label: "PPL_UNNAMED" },
    ]);
  });
});

describe("name facet — what the shared globe reads", () => {
  // @req REQ-117
  it("publishes each name of the selection with the countries it reaches", async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation(() =>
      buildChain(
        {
          data: [
            {
              id: "PAT_KEITA",
              name_main: "Keïta",
              afrik_patronyme_countries: [
                { country_id: "MLI" },
                { country_id: "GIN" },
              ],
            },
          ],
          error: null,
        },
        calls
      )
    );

    const index = await getPatronymesFacetCountryIndex({
      nameSystem: null,
      peopleId: null,
      countryId: null,
      letter: null,
    });

    expect(index).toEqual([
      { id: "PAT_KEITA", nameMain: "Keïta", countryIds: ["MLI", "GIN"] },
    ]);
  });
});

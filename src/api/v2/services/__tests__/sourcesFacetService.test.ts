import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import {
  getSourcesFacetPage,
  getSourcesFacetChoices,
  SOURCES_FACET_PAGE_SIZES,
  type SourcesFacetFilters,
} from "../sourcesFacet";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

const NO_FILTERS: SourcesFacetFilters = {
  search: null,
  standing: null,
  sourceKind: null,
  decade: null,
  letter: null,
  sort: null,
};

/**
 * A stand-in for the PostgREST builder: every narrowing returns the builder,
 * and `range` is the one that resolves. Recording the calls is the point —
 * what this service gets wrong is never the shape of its result, it is which
 * operator it reaches for.
 */
function buildQuery(
  rows: Array<Record<string, unknown>> = [],
  count = 0
): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  const chain = () => query;
  for (const method of [
    "select",
    "or",
    "eq",
    "is",
    "gte",
    "lt",
    "ilike",
    "order",
  ]) {
    query[method] = vi.fn(chain);
  }
  query.range = vi.fn(() =>
    Promise.resolve({ data: rows, error: null, count })
  );
  return query;
}

describe("sources facet service", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  describe("getSourcesFacetPage", () => {
    // @req REQ-114
    it("strips the filter syntax a reader types into a bibliography search", async () => {
      const query = buildQuery();
      fromMock.mockReturnValue(query);

      await getSourcesFacetPage(
        1,
        { ...NO_FILTERS, search: "Murdock, G.P. (1959)" },
        20
      );

      const filter = query.or.mock.calls[0][0] as string;
      // The comma that remains is the separator between the two conditions.
      // What the term must not do is add a third one — which is exactly what
      // "Murdock, G.P." would do if it reached the filter intact.
      expect(filter.split(",")).toHaveLength(2);
      expect(filter).not.toContain("(");
      expect(filter).not.toContain(")");
      expect(filter).toContain("title.ilike");
      expect(filter).toContain("author.ilike");
    });

    /**
     * 335 sources carry no tier. That is "not yet classified", which the
     * project's own doctrine separates from "unverified" — folding one onto
     * the other states a judgement nobody made.
     */
    // @req REQ-114
    it("narrows an unclassified standing with is-null, never with equals-null", async () => {
      const query = buildQuery();
      fromMock.mockReturnValue(query);

      await getSourcesFacetPage(
        1,
        { ...NO_FILTERS, standing: "needs_review" },
        20
      );

      expect(query.is).toHaveBeenCalledWith("tier", null);
      expect(query.eq).not.toHaveBeenCalledWith("tier", null);
    });

    // @req REQ-114
    it("narrows a tiered standing with equals", async () => {
      const query = buildQuery();
      fromMock.mockReturnValue(query);

      await getSourcesFacetPage(1, { ...NO_FILTERS, standing: "official" }, 20);

      expect(query.eq).toHaveBeenCalledWith("tier", "official");
      expect(query.is).not.toHaveBeenCalled();
    });

    // @req REQ-114
    it("reads a decade as a half-open range, so 1999 is in the nineties and 2000 is not", async () => {
      const query = buildQuery();
      fromMock.mockReturnValue(query);

      await getSourcesFacetPage(1, { ...NO_FILTERS, decade: 1990 }, 20);

      expect(query.gte).toHaveBeenCalledWith("year", 1990);
      expect(query.lt).toHaveBeenCalledWith("year", 2000);
    });

    // @req REQ-114
    it("anchors a letter narrowing at the start of the title", async () => {
      const query = buildQuery();
      fromMock.mockReturnValue(query);

      await getSourcesFacetPage(1, { ...NO_FILTERS, letter: "M" }, 20);

      expect(query.ilike).toHaveBeenCalledWith("title", "M%");
    });

    // @req REQ-108
    it("asks for the slice the requested page describes", async () => {
      const query = buildQuery([{ id: "a", title: "A" }], 120);
      fromMock.mockReturnValue(query);

      const result = await getSourcesFacetPage(3, NO_FILTERS, 20);

      expect(fromMock).toHaveBeenCalledWith("sources");
      expect(query.range).toHaveBeenCalledWith(40, 59);
      expect(result.page).toBe(3);
      expect(result.total).toBe(120);
      expect(result.totalPages).toBe(6);
    });

    /**
     * An address outlives the selection it was taken from: narrowing turns
     * forty pages into two, and every link already sent to page nine would
     * otherwise read as an empty corpus.
     */
    // @req REQ-108
    it("answers a page past the end with the last one, and does not move the total", async () => {
      const query = buildQuery([{ id: "a", title: "A" }], 25);
      fromMock.mockReturnValue(query);

      const result = await getSourcesFacetPage(99, NO_FILTERS, 20);

      expect(result.page).toBe(2);
      expect(result.total).toBe(25);
      expect(query.range).toHaveBeenLastCalledWith(20, 39);
    });

    /**
     * PostgREST answers a range beyond the table with 416 rather than with an
     * empty page, and it still reports the row count in Content-Range. Read as
     * a plain failure that 500s the page, which is what it did: `?page=99999`
     * took the whole directory down instead of landing on the last page.
     */
    // @req REQ-108
    it("lands on the last page when the server refuses an out-of-range slice", async () => {
      // The refusal carries no count — measured, which is why asking for one
      // separately is the only way back to the last page.
      const refused = buildQuery([]);
      refused.range = vi.fn(() =>
        Promise.resolve({
          data: null,
          error: { message: "Requested range not satisfiable" },
          count: null,
        })
      );
      // A head count resolves the builder itself rather than a `range` call.
      const counted = buildQuery([]);
      counted.then = vi.fn((resolve: (value: unknown) => unknown) =>
        Promise.resolve({ count: 25, error: null }).then(resolve)
      );
      const lastPage = buildQuery([{ id: "a", title: "A" }], 25);

      fromMock
        .mockReturnValueOnce(refused)
        .mockReturnValueOnce(counted)
        .mockReturnValueOnce(lastPage);

      const result = await getSourcesFacetPage(99999, NO_FILTERS, 20);

      expect(result.page).toBe(2);
      expect(result.total).toBe(25);
      expect(result.sources).toHaveLength(1);
      expect(lastPage.range).toHaveBeenCalledWith(20, 39);
    });

    // @req REQ-108
    it("still reports a genuine query failure rather than swallowing it", async () => {
      const broken = buildQuery([]);
      broken.range = vi.fn(() =>
        Promise.resolve({
          data: null,
          error: { message: "column does not exist" },
          count: null,
        })
      );
      fromMock.mockReturnValue(broken);

      await expect(getSourcesFacetPage(1, NO_FILTERS, 20)).rejects.toThrow(
        "column does not exist"
      );
    });

    // @req REQ-108
    it("offers a hundred rows at most, so an address cannot ask for the corpus", () => {
      expect(SOURCES_FACET_PAGE_SIZES).toEqual([20, 50, 100]);
    });
  });

  describe("getSourcesFacetChoices", () => {
    /**
     * The one that bit silently. PostgREST stops a select at a thousand rows
     * with no error, and asking for a wider range does not lift it — measured:
     * the directory said "4 395 sources" from the count while its facets
     * described the first thousand, so the standings summed to exactly 1 000
     * and provenance read "7 sur 1 000". Only paging until the table runs out
     * gets the real figures.
     */
    // @req REQ-114
    it("pages until the table runs out, because the row cap is the server's", async () => {
      const full = Array.from({ length: 1000 }, () => ({
        tier: "official",
        source_kind: null,
        year: null,
      }));
      const tail = [{ tier: "referenced", source_kind: null, year: null }];

      const first = buildQuery(full);
      const second = buildQuery(tail);
      fromMock.mockReturnValueOnce(first).mockReturnValueOnce(second);

      const choices = await getSourcesFacetChoices();

      expect(first.range).toHaveBeenCalledWith(0, 999);
      expect(second.range).toHaveBeenCalledWith(1000, 1999);
      expect(choices.total).toBe(1001);
      expect(choices.standings).toEqual([
        { id: "official", label: "Officielle", count: 1000 },
        { id: "referenced", label: "Référencée", count: 1 },
      ]);
    });

    /**
     * A range without an order is a range over an unspecified sequence: two
     * pages could repeat a row and miss another, and no assertion about totals
     * would catch it.
     */
    // @req REQ-114
    it("orders the paged read, so the pages describe disjoint rows", async () => {
      const query = buildQuery([]);
      fromMock.mockReturnValue(query);

      await getSourcesFacetChoices();

      expect(query.order).toHaveBeenCalledWith("id");
    });

    // @req REQ-114
    it("stops after one read when the corpus fits in a single page", async () => {
      const query = buildQuery([
        { tier: "official", source_kind: null, year: null },
      ]);
      fromMock.mockReturnValue(query);

      await getSourcesFacetChoices();

      expect(query.range).toHaveBeenCalledTimes(1);
    });

    // @req REQ-114
    it("offers only the standings the corpus actually holds, with their counts", async () => {
      const query = buildQuery(
        [
          { tier: "official", source_kind: null, year: 2024 },
          { tier: "official", source_kind: null, year: null },
          { tier: null, source_kind: "ai_generated", year: null },
        ],
        3
      );
      fromMock.mockReturnValue(query);

      const choices = await getSourcesFacetChoices();

      // French by contract: the endpoint has no locale parameter, so the
      // glossary keying the labels by locale must not change this payload.
      expect(choices.standings).toEqual([
        { id: "official", label: "Officielle", count: 2 },
        { id: "needs_review", label: "En attente d'examen", count: 1 },
      ]);
    });

    // @req REQ-114
    it("groups years into decades and leaves undated sources out of them", async () => {
      const query = buildQuery(
        [
          { tier: "official", source_kind: null, year: 1994 },
          { tier: "official", source_kind: null, year: 1999 },
          { tier: "official", source_kind: null, year: 2024 },
          { tier: "official", source_kind: null, year: null },
        ],
        4
      );
      fromMock.mockReturnValue(query);

      const choices = await getSourcesFacetChoices();

      expect(choices.decades).toEqual([
        { id: "2020", label: "2020–2029", count: 1 },
        { id: "1990", label: "1990–1999", count: 2 },
      ]);
    });
  });
});

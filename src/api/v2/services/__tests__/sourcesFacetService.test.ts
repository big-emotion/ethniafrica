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

    // @req REQ-108
    it("offers a hundred rows at most, so an address cannot ask for the corpus", () => {
      expect(SOURCES_FACET_PAGE_SIZES).toEqual([20, 50, 100]);
    });
  });

  describe("getSourcesFacetChoices", () => {
    /**
     * The one that bites silently: a Supabase select stops at a thousand rows
     * by default, so counting 4 395 sources without an explicit range would
     * report confident, wrong figures and never raise.
     */
    // @req REQ-114
    it("reads past the thousand-row cap a select applies by default", async () => {
      const query = buildQuery([], 0);
      fromMock.mockReturnValue(query);

      await getSourcesFacetChoices();

      const [, upperBound] = query.range.mock.calls[0];
      expect(upperBound).toBeGreaterThan(4395);
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

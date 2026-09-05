import { mapRowToSource } from "@/api/v2/services/sourceMapper";
import type { Source } from "@/api/v2/schemas/sources";
import { createServerClient } from "@/lib/supabase/server";
import { escapeSearchTerm } from "@/lib/supabase/searchTerm";
import { sourceStandingLabel } from "@/lib/glossaire/vocabularies";
import {
  SOURCE_KINDS,
  SOURCE_TIERS,
  type SourceKind,
  type SourceTier,
} from "@/types/sources";

/**
 * What the sources directory reads.
 *
 * Its own service rather than a tail on `sources.ts`: that one answers "give
 * me a page of sources" for the public API, while this one answers the two
 * questions one screen asks together — the page being read, and what the
 * reader may narrow it to. Keeping them together is what stops the list and
 * the filter bar disagreeing about which narrowings exist.
 *
 * One narrowing is deliberately absent. "Cited by" reads well as a facet until
 * you measure it: 3 943 of the 4 395 sources are cited by a people, so the
 * filter would keep ninety percent of the corpus, and applying it would mean
 * passing those 3 943 ids back as an `in` list. The question is worth asking of
 * a single source, which is where the directory asks it — on the source's own
 * page, through `getSourceCitations`.
 */

/**
 * A tier, or the absence of one.
 *
 * `needs_review` is not a fourth tier: it is the 335 rows nobody has classified
 * yet. The distinction is load-bearing — showing them as "Non vérifiée" would
 * state a judgement no editor made — so it travels as its own filter value and
 * resolves to `IS NULL`, never to an equality against null.
 */
export type SourceStanding = SourceTier | "needs_review";

/** The reader's narrowing, as it arrives from the query string: null is "no filter". */
export interface SourcesFacetFilters {
  search: string | null;
  standing: SourceStanding | null;
  sourceKind: SourceKind | null;
  decade: number | null;
  letter: string | null;
  sort: SourcesFacetSort | null;
}

export type SourcesFacetSort = "titre" | "annee" | "ajout";

export interface SourcesFacetChoice {
  id: string;
  label: string;
  count: number;
}

export interface SourcesFacetChoices {
  standings: SourcesFacetChoice[];
  sourceKinds: SourcesFacetChoice[];
  decades: SourcesFacetChoice[];
  /** Every source in the corpus, for the copy that owns up to a sparse facet. */
  total: number;
  /** How many of them declare a provenance. Twenty, at the time of writing. */
  withSourceKind: number;
}

export interface SourcesFacetPage {
  sources: Source[];
  page: number;
  total: number;
  totalPages: number;
}

// @req REQ-108
export const SOURCES_FACET_PER_PAGE = 20;

/**
 * The page sizes the directory offers, default first.
 *
 * An allowlist because the size ends up as a range on a database query: an
 * arbitrary number from the address bar would let an anonymous request ask for
 * the whole table in one page.
 */
// @req REQ-108
export const SOURCES_FACET_PAGE_SIZES = [20, 50, 100] as const;

/**
 * The server's own row cap, which a client cannot raise.
 *
 * PostgREST stops a select at a thousand rows, with no error and no signal, and
 * asking for `range(0, 20000)` does not lift it — it was measured doing exactly
 * that: the directory reported "4 395 sources" from the count while its facets
 * described the first thousand, so provenance read "7 sources sur 1 000" and
 * the standings summed to 1 000. A facet that undercounts still looks like a
 * working facet, which is what makes this the worst failure available here.
 *
 * So the counting read pages until the table is exhausted.
 */
const CHOICES_PAGE_SIZE = 1000;

/** Bounds the loop against a server that never returns a short page. */
const CHOICES_MAX_PAGES = 50;

const SORT_COLUMNS: Record<
  SourcesFacetSort,
  { column: string; ascending: boolean }
> = {
  titre: { column: "title", ascending: true },
  annee: { column: "year", ascending: false },
  ajout: { column: "added_at", ascending: false },
};

/** The columns the facet counts over — three narrow ones, not the whole row. */
const CHOICE_COLUMNS = "tier, source_kind, year";

interface ChoiceRow {
  tier: string | null;
  source_kind: string | null;
  year: number | null;
}

/**
 * Every row of `sources`, three columns wide, read a server page at a time.
 *
 * Ordered by id because a range without an order is a range over an
 * unspecified sequence: successive pages could repeat a row and miss another,
 * and the counts would be wrong in a way no assertion about totals would catch.
 */
async function readEveryChoiceRow(): Promise<ChoiceRow[]> {
  const supabase = createServerClient();
  const rows: ChoiceRow[] = [];

  for (let page = 0; page < CHOICES_MAX_PAGES; page += 1) {
    const from = page * CHOICES_PAGE_SIZE;
    const { data, error } = await supabase
      .from("sources")
      .select(CHOICE_COLUMNS)
      .order("id")
      .range(from, from + CHOICES_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const batch = (data ?? []) as ChoiceRow[];
    rows.push(...batch);
    // A short page is the end of the table; a full one may not be.
    if (batch.length < CHOICES_PAGE_SIZE) break;
  }

  return rows;
}

function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

function standingOf(tier: unknown): SourceStanding {
  return SOURCE_TIERS.includes(tier as SourceTier)
    ? (tier as SourceTier)
    : "needs_review";
}

/** The narrowings a source query understands. Sort and paging stay per caller. */
export type SourceNarrowing = Pick<
  SourcesFacetFilters,
  "search" | "standing" | "sourceKind" | "decade" | "letter"
>;

/** The subset of the PostgREST builder a narrowing touches. */
interface NarrowableQuery {
  or(filter: string): NarrowableQuery;
  eq(column: string, value: string): NarrowableQuery;
  is(column: string, value: null): NarrowableQuery;
  gte(column: string, value: number): NarrowableQuery;
  lt(column: string, value: number): NarrowableQuery;
  ilike(column: string, pattern: string): NarrowableQuery;
}

/**
 * Applies a reader's narrowing to a `sources` query.
 *
 * Shared by the directory and the public endpoint on purpose: the same request
 * has to mean the same thing through both doors, and two copies of "what
 * `needs_review` selects" would be one copy away from the two disagreeing.
 */
// @req REQ-114
export function narrowSourcesQuery<T>(query: T, filters: SourceNarrowing): T {
  let narrowed = query as unknown as NarrowableQuery;

  const term = filters.search ? escapeSearchTerm(filters.search) : "";
  if (term) {
    narrowed = narrowed.or(
      [`title.ilike.%${term}%`, `author.ilike.%${term}%`].join(",")
    );
  }

  // `needs_review` is the absence of a tier, so it is IS NULL — an equality
  // against null matches nothing and would report an empty corpus.
  if (filters.standing === "needs_review") {
    narrowed = narrowed.is("tier", null);
  } else if (filters.standing) {
    narrowed = narrowed.eq("tier", filters.standing);
  }

  if (filters.sourceKind) {
    narrowed = narrowed.eq("source_kind", filters.sourceKind);
  }

  if (filters.decade !== null && filters.decade !== undefined) {
    // Half-open, so 1999 belongs to the nineties and 2000 does not.
    narrowed = narrowed
      .gte("year", filters.decade)
      .lt("year", filters.decade + 10);
  }

  if (filters.letter) {
    narrowed = narrowed.ilike("title", `${filters.letter}%`);
  }

  return narrowed as unknown as T;
}

/** PostgREST's own code for a range beyond the table, with its message as fallback. */
function isRangeRefusal(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST103" ||
    /range not satisfiable/i.test(error.message ?? "")
  );
}

/** How many rows the selection holds, without fetching any of them. */
async function countNarrowed(filters: SourceNarrowing): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await narrowSourcesQuery(
    supabase.from("sources").select("*", { count: "exact", head: true }),
    filters
  );

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * One page of the directory, narrowed at the database.
 *
 * The total comes back from the same narrowed query, so the pager describes
 * the filtered set rather than the corpus. A page past the end is answered
 * with the last one instead of with nothing: addresses outlive the selection
 * they were taken from, and a link to page nine sent before a narrowing would
 * otherwise read as an empty bibliography.
 */
// @req REQ-114
export async function getSourcesFacetPage(
  page: number,
  filters: SourcesFacetFilters,
  perPage: number = SOURCES_FACET_PER_PAGE
): Promise<SourcesFacetPage> {
  const read = async (which: number) => {
    const supabase = createServerClient();
    let query = narrowSourcesQuery(
      supabase.from("sources").select("*", { count: "exact" }),
      filters
    );

    const order = SORT_COLUMNS[filters.sort ?? "titre"] ?? SORT_COLUMNS.titre;
    query = query.order(order.column, { ascending: order.ascending });

    const from = (which - 1) * perPage;
    return query.range(from, from + perPage - 1);
  };

  // The page number is typed into an address bar as readily as it is clicked.
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const first = await read(requested);

  /**
   * A range past the end of the table is refused outright — 416, no rows and,
   * measured, no count either — rather than answered with an empty page. Read
   * as a plain failure it took the directory down: `?page=99999` answered 500.
   *
   * So the refusal is recognised and the count asked for separately, which
   * costs an extra round trip only on an address that is already wrong. Any
   * other failure is a real one and still throws.
   */
  let total: number;
  let rows = first.data ?? [];
  let resolved = requested;

  if (first.error) {
    if (!isRangeRefusal(first.error)) throw new Error(first.error.message);
    total = await countNarrowed(filters);
  } else {
    total = first.count ?? 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (first.error || requested > totalPages) {
    resolved = totalPages;
    const last = await read(resolved);
    if (last.error) throw new Error(last.error.message);
    rows = last.data ?? [];
  }

  return {
    sources: rows.map(mapRowToSource),
    page: resolved,
    total,
    totalPages,
  };
}

/**
 * What the reader may narrow to — and only that.
 *
 * An option the corpus cannot answer reads as a claim that it holds such
 * sources, and pays the reader back with an empty list when they take the
 * claim up. So each facet is built from the values actually present, and each
 * carries its count, because a shelf that hides how much it holds asserts an
 * absence nobody checked.
 *
 * Counted in one read rather than one query per value: three narrow columns
 * over 4 395 rows is a single round trip, where fourteen `count` queries would
 * be fourteen. The figures describe the whole corpus, not the current
 * selection — narrowed counts would need a grouping the database does not
 * expose here, and the peoples facet makes the same trade.
 */
// @req REQ-114
export async function getSourcesFacetChoices(): Promise<SourcesFacetChoices> {
  const rows = await readEveryChoiceRow();

  const standings = new Map<SourceStanding, number>();
  const kinds = new Map<string, number>();
  const decades = new Map<number, number>();

  for (const row of rows) {
    const standing = standingOf(row.tier);
    standings.set(standing, (standings.get(standing) ?? 0) + 1);

    if (row.source_kind) {
      kinds.set(row.source_kind, (kinds.get(row.source_kind) ?? 0) + 1);
    }

    if (typeof row.year === "number") {
      const decade = decadeOf(row.year);
      decades.set(decade, (decades.get(decade) ?? 0) + 1);
    }
  }

  const standingOrder: SourceStanding[] = [...SOURCE_TIERS, "needs_review"];

  return {
    standings: standingOrder
      .filter((standing) => standings.has(standing))
      .map((standing) => ({
        id: standing,
        // French by contract: the endpoint has no locale parameter, and its
        // consumers pin these values. Wiring a `lang` through is an API
        // decision, not a label one.
        label: sourceStandingLabel(standing, "fr"),
        count: standings.get(standing) ?? 0,
      })),
    sourceKinds: SOURCE_KINDS.filter((kind) => kinds.has(kind)).map((kind) => ({
      id: kind,
      label: kind,
      count: kinds.get(kind) ?? 0,
    })),
    decades: [...decades.entries()]
      .sort(([a], [b]) => b - a)
      .map(([decade, count]) => ({
        id: String(decade),
        label: `${decade}–${decade + 9}`,
        count,
      })),
    total: rows.length,
    withSourceKind: [...kinds.values()].reduce((sum, n) => sum + n, 0),
  };
}

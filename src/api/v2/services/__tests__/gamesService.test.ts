/**
 * Scoping is a query concern, not a filter concern (REQ-120).
 *
 * `loadPeoples` reads the first `PEOPLE_POOL_SIZE` peoples by id out of a
 * corpus of ~890. Narrowing that page after it came back would ask "which of
 * these 150 are Ghanaian?" instead of "which peoples are Ghanaian?", and a
 * country whose peoples all sort late would come back empty while the corpus
 * holds plenty. So the scope has to reach the query, and these tests hold it
 * there.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { loadGameCorpus } = await import("../gamesService");

interface FakeResult {
  data: unknown;
  error: unknown;
}

/** Terminal call is `.limit()`; every filter in between returns the builder. */
function peoplesQuery(result: FakeResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

function orderedQuery(result: FakeResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

function joinQuery(result: FakeResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => Promise.resolve(result)),
    in: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

const EMPTY = { data: [], error: null };

function wireTables(overrides: Record<string, unknown> = {}) {
  const tables: Record<string, unknown> = {
    afrik_peoples: peoplesQuery(EMPTY),
    afrik_language_families: orderedQuery(EMPTY),
    afrik_countries: orderedQuery(EMPTY),
    afrik_people_countries: joinQuery(EMPTY),
    ...overrides,
  };
  fromMock.mockImplementation((table: string) => tables[table]);
  return tables;
}

beforeEach(() => {
  fromMock.mockReset();
});

describe("loadGameCorpus scoping", () => {
  // @req REQ-120
  it("filters the peoples query by language family when a family is scoped", async () => {
    const tables = wireTables();

    await loadGameCorpus("peoples", { familyId: "FLG_NIGER_CONGO" });

    const peoples = tables.afrik_peoples as ReturnType<typeof peoplesQuery>;
    expect(peoples.eq).toHaveBeenCalledWith(
      "language_family_id",
      "FLG_NIGER_CONGO"
    );
  });

  // @req REQ-120
  it("resolves a country scope through the join table before reading peoples", async () => {
    const tables = wireTables({
      afrik_people_countries: joinQuery({
        data: [{ people_id: "PPL_AKAN" }, { people_id: "PPL_EWE" }],
        error: null,
      }),
    });

    await loadGameCorpus("peoples", { countryId: "GHA" });

    const join = tables.afrik_people_countries as ReturnType<typeof joinQuery>;
    expect(join.eq).toHaveBeenCalledWith("country_id", "GHA");

    const peoples = tables.afrik_peoples as ReturnType<typeof peoplesQuery>;
    expect(peoples.in).toHaveBeenCalledWith("id", ["PPL_AKAN", "PPL_EWE"]);
  });

  // @req REQ-120
  it("returns no peoples rather than the whole corpus when a country has none", async () => {
    const tables = wireTables();

    const corpus = await loadGameCorpus("peoples", { countryId: "XXX" });

    // Skipping the `in` filter here would quietly serve a session about the
    // whole continent under a country's name.
    const peoples = tables.afrik_peoples as ReturnType<typeof peoplesQuery>;
    expect(peoples.limit).not.toHaveBeenCalled();
    expect(corpus.peoples).toEqual([]);
  });

  // @req REQ-120
  it("leaves the query unfiltered when nothing is scoped", async () => {
    const tables = wireTables();

    await loadGameCorpus("peoples");

    const peoples = tables.afrik_peoples as ReturnType<typeof peoplesQuery>;
    expect(peoples.eq).not.toHaveBeenCalled();
    expect(peoples.in).not.toHaveBeenCalled();
    expect(peoples.limit).toHaveBeenCalled();
  });

  // @req REQ-120
  it("keeps the full country and family lists so a scoped session can still be re-scoped", async () => {
    wireTables({
      afrik_language_families: orderedQuery({
        data: [
          { id: "FLG_A", name_fr: "Famille A" },
          { id: "FLG_B", name_fr: "Famille B" },
        ],
        error: null,
      }),
      afrik_countries: orderedQuery({
        data: [{ id: "GHA", name_fr: "Ghana" }],
        error: null,
      }),
    });

    const corpus = await loadGameCorpus("peoples", { familyId: "FLG_A" });

    // The picker's vocabulary must not shrink to the current scope, or a
    // reader could narrow once and never get back out.
    expect(corpus.families).toHaveLength(2);
    expect(corpus.countries).toHaveLength(1);
  });

  // @req REQ-120
  it("ignores a scope on a game that reads only countries", async () => {
    const tables = wireTables();

    await loadGameCorpus("countries", { familyId: "FLG_A" });

    expect(tables.afrik_peoples).toBeDefined();
    expect(fromMock).not.toHaveBeenCalledWith("afrik_peoples");
  });
});

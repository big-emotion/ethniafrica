import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { unstableCacheMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(
    (callback: (...args: unknown[]) => unknown) => callback
  ),
}));
vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}));

import {
  getHubModules,
  isModuleAvailable,
} from "@/lib/hubs/moduleAvailability";
import {
  MODULE_DEFINITIONS,
  type ModuleDataSource,
} from "@/lib/hubs/moduleRegistry";

/** The view migration 080 adds, and the only relation the fast path reads. */
const PRESENCE_VIEW = "hub_module_corpus_presence";

const PRESENCE_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/080_hub_module_corpus_presence.sql"
);

/** Every table some module waits on, in the registry's own words. */
const DECLARED_DATA_SOURCES = [
  ...new Set(
    MODULE_DEFINITIONS.map((definition) => definition.dataSource).filter(
      (source): source is ModuleDataSource => Boolean(source)
    )
  ),
];

interface QueryOutcome {
  data: unknown[] | null;
  error: { code?: string; message: string } | null;
}

/** What one `.from(...)` chain asked for, so a test can hold it to a shape. */
interface RecordedQuery {
  table: string;
  columns: string[];
  selectOptions: unknown[];
  filters: [string, unknown][];
  limits: number[];
}

/**
 * A fake Supabase client whose `.from(table)` returns a thenable builder
 * resolving to the outcome configured for that table, and recording what was
 * asked of it. Chain order matters to the real client — `.eq()` exists on the
 * filter builder and not on the transform builder `.limit()` returns — so the
 * fake stays chainable throughout rather than reproducing that split, and the
 * shape assertions below carry the contract instead.
 */
function buildSupabaseMock(outcomes: Partial<Record<string, QueryOutcome>>) {
  const queries: RecordedQuery[] = [];

  const from = vi.fn((table: string) => {
    const outcome: QueryOutcome = outcomes[table] ?? {
      data: [],
      error: null,
    };
    const recorded: RecordedQuery = {
      table,
      columns: [],
      selectOptions: [],
      filters: [],
      limits: [],
    };
    queries.push(recorded);

    const builder = {
      select: vi.fn((columns?: string, options?: unknown) => {
        recorded.columns.push(columns ?? "");
        recorded.selectOptions.push(options);
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        recorded.filters.push([column, value]);
        return builder;
      }),
      limit: vi.fn((rows: number) => {
        recorded.limits.push(rows);
        return builder;
      }),
      then: (
        resolve: (value: QueryOutcome) => unknown,
        reject: (reason: unknown) => unknown
      ) => Promise.resolve(outcome).then(resolve, reject),
    };
    return builder;
  });

  return { from, queries };
}

/** The view's answer: every declared source live unless overridden. */
function presenceView(
  overrides: Partial<Record<ModuleDataSource, boolean>> = {}
): QueryOutcome {
  return {
    data: DECLARED_DATA_SOURCES.map((source) => ({
      data_source: source,
      has_rows: overrides[source] ?? true,
    })),
    error: null,
  };
}

/** The view is gone — what production answers before 080 is applied. */
const VIEW_MISSING: QueryOutcome = {
  data: null,
  error: { code: "42P01", message: 'relation "…" does not exist' },
};

/** What a saturated database answers: nothing, in time (57014). */
const STATEMENT_TIMEOUT: QueryOutcome = {
  data: null,
  error: {
    code: "57014",
    message: "canceling statement due to statement timeout",
  },
};

/** One row back, so the direct probe reads the source as live. */
const ONE_ROW: QueryOutcome = { data: [{ id: "PPL_ANY" }], error: null };

/** No row back, so the direct probe reads the source as genuinely empty. */
const NO_ROW: QueryOutcome = { data: [], error: null };

describe("moduleAvailability — REQ-106/REQ-114 data-backed hub availability", () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
  });

  // @req REQ-106 @req REQ-114
  it("marks a data module unavailable when the view reports its source empty", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        [PRESENCE_VIEW]: presenceView({ afrik_peoples: false }),
      })
    );

    const modules = await getHubModules("atlas");

    expect(modules.find((m) => m.id === "peuples")?.available).toBe(false);
  });

  // @req REQ-106 @req REQ-114
  it("marks a data module available when the view reports rows behind it", async () => {
    // Drawn from Explorer and Jouer rather than Comprendre: every Comprendre
    // module that reads a table is now declared `draft`, so none of them can
    // stand in for "the corpus is what decides".
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({ [PRESENCE_VIEW]: presenceView() })
    );

    const explorer = await getHubModules("atlas");
    const jouer = await getHubModules("jeux");

    expect(explorer.find((m) => m.id === "pays")?.available).toBe(true);
    expect(jouer.find((m) => m.id === "quiz")?.available).toBe(true);
  });

  /**
   * The defect this file exists for. A 790-people corpus was hidden behind
   * « Bientôt » because the probe asked PostgREST for an exact count over
   * `select("*")`, which blew the three-second `anon` statement timeout on a
   * table carrying 38 MB of TOASTed JSONB — and the error was read as "no
   * rows". Nothing here may ask the corpus how many of anything it holds.
   */
  // @req REQ-106 @req REQ-114
  it("never asks a corpus table for a count", async () => {
    const supabase = buildSupabaseMock({ [PRESENCE_VIEW]: VIEW_MISSING });
    createServerClientMock.mockReturnValue(supabase);

    await getHubModules("atlas");

    const corpusQueries = supabase.queries.filter(
      (query) => query.table !== PRESENCE_VIEW
    );
    expect(corpusQueries.length).toBeGreaterThan(0);
    for (const query of corpusQueries) {
      expect(query.columns, query.table).toEqual(["id"]);
      // `undefined` is the whole assertion: the second argument to `select()`
      // is where `{ count: "exact" }` used to live.
      expect(query.selectOptions, query.table).toEqual([undefined]);
      expect(query.limits, query.table).toEqual([1]);
    }
  });

  // @req REQ-106 @req REQ-114
  it("reads every source in one round trip when the view answers", async () => {
    const supabase = buildSupabaseMock({
      [PRESENCE_VIEW]: presenceView(),
    });
    createServerClientMock.mockReturnValue(supabase);

    await getHubModules("atlas");

    expect(supabase.queries.map((query) => query.table)).toEqual([
      PRESENCE_VIEW,
    ]);
  });

  /**
   * Production applies its migrations by hand, so the code can land there
   * before the view does. Falling back keeps the measured half honest in
   * that window instead of making every module guesswork.
   */
  // @req REQ-106 @req REQ-114
  it("falls back to a bounded row probe when the view is missing", async () => {
    const supabase = buildSupabaseMock({
      [PRESENCE_VIEW]: VIEW_MISSING,
      afrik_peoples: NO_ROW,
      afrik_countries: ONE_ROW,
    });
    createServerClientMock.mockReturnValue(supabase);

    const modules = await getHubModules("atlas");

    expect(modules.find((m) => m.id === "peuples")?.available).toBe(false);
    expect(modules.find((m) => m.id === "pays")?.available).toBe(true);
  });

  /**
   * The inversion. `hasAtLeastOneRow` resolved a failed query and an empty
   * table to the same `false`, so a database that did not answer in time
   * took a built page off the site for the next sixty seconds. Unknown is
   * not empty: the module stays offered, and the reader meets an empty list
   * at worst rather than a door that is not there.
   */
  // @req REQ-106 @req REQ-114
  it("keeps a data module offered when its source cannot be reached", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        [PRESENCE_VIEW]: STATEMENT_TIMEOUT,
        afrik_peoples: STATEMENT_TIMEOUT,
      })
    );

    const modules = await getHubModules("atlas");

    expect(modules.find((m) => m.id === "peuples")?.available).toBe(true);
  });

  // @req REQ-106 @req REQ-114
  it("keeps a data module offered when the probe throws", async () => {
    const from = vi.fn(() => {
      throw new Error("network unreachable");
    });
    createServerClientMock.mockReturnValue({ from });

    const modules = await getHubModules("atlas");

    expect(modules.find((m) => m.id === "familles")?.available).toBe(true);
  });

  /**
   * Fail-open is scoped to the measured half. A module its editor called
   * unready must not be talked back into the menu by a database outage —
   * that is the one thing the declared half exists to hold.
   */
  // @req REQ-106 @req REQ-114
  it("leaves a module in preparation unavailable even when nothing answers", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({ [PRESENCE_VIEW]: STATEMENT_TIMEOUT })
    );

    const modules = await getHubModules("dossiers");

    expect(modules.find((m) => m.id === "frise")?.available).toBe(false);
  });

  // @req REQ-106 @req REQ-114
  it("applies the entity_type=people filter for the noms probe", async () => {
    const supabase = buildSupabaseMock({
      [PRESENCE_VIEW]: VIEW_MISSING,
      name_records: ONE_ROW,
    });
    createServerClientMock.mockReturnValue(supabase);

    await getHubModules("atlas");

    const nameQuery = supabase.queries.find(
      (query) => query.table === "name_records"
    );
    expect(nameQuery?.filters).toEqual([["entity_type", "people"]]);
  });

  // A wrong table name here would read as "still coming soon" rather than as
  // a broken probe.
  // @req REQ-120
  it("reads the countries source for the mercator game", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        [PRESENCE_VIEW]: presenceView({ afrik_countries: false }),
      })
    );

    const modules = await getHubModules("jeux");

    expect(modules.find((m) => m.id === "mercator")?.available).toBe(false);
  });

  // Each surface stands on its own table, so one empty source darkens one
  // entry and leaves the other alone.
  // @req REQ-120
  it("takes a game off the hub when its own table is empty", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        [PRESENCE_VIEW]: presenceView({ afrik_countries: false }),
      })
    );

    const modules = await getHubModules("jeux");

    expect(modules.find((m) => m.id === "mercator")?.available).toBe(false);
    expect(modules.find((m) => m.id === "quiz")?.available).toBe(true);
  });

  // @req REQ-106 @req REQ-114
  it("keeps a static module live without ever touching the database", async () => {
    const available = await isModuleAvailable({ availability: "static" });

    expect(available).toBe(true);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  // @req REQ-106 @req REQ-114
  it("surfaces a static module as live even when every source is empty", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        [PRESENCE_VIEW]: {
          data: DECLARED_DATA_SOURCES.map((source) => ({
            data_source: source,
            has_rows: false,
          })),
          error: null,
        },
      })
    );

    const comprendre = await getHubModules("dossiers");
    const explorer = await getHubModules("atlas");

    expect(comprendre.find((m) => m.id === "anecdotes")?.available).toBe(true);
    expect(comprendre.find((m) => m.id === "frise")?.available).toBe(false);
    expect(explorer.find((m) => m.id === "noms")?.available).toBe(false);
  });

  // The hub used to drop a module behind a dark flag, so the quiz was
  // missing from a build that had simply not been given a variable. Nothing
  // is dropped now: what a module waits on is its corpus.
  // @req REQ-106 @req REQ-114
  it("lists the quiz whatever the environment says", async () => {
    const original = process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({ [PRESENCE_VIEW]: presenceView() })
    );

    try {
      const modules = await getHubModules("jeux");

      expect(modules.map((m) => m.id)).toContain("quiz");
      expect(modules.find((m) => m.id === "quiz")?.available).toBe(true);
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_FEATURE_QUIZ = original;
      }
    }
  });

  // @req REQ-106 @req REQ-114
  it("keeps the quiz listed, unavailable, when its bank is empty", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        [PRESENCE_VIEW]: presenceView({ quiz_questions: false }),
      })
    );

    const modules = await getHubModules("jeux");
    const quiz = modules.find((m) => m.id === "quiz");

    // Listed and honest, rather than gone: a reader can see the module
    // exists and that it has nothing to serve yet.
    expect(quiz).toBeDefined();
    expect(quiz?.available).toBe(false);
  });

  // A full table says the module has rows, never that the rows are worth
  // reading. The frise is the case that forced the distinction: six sourced
  // events pass any row count and still answer nothing (atlas-charter §3).
  // @req REQ-106 @req REQ-114
  it("keeps a module in preparation unavailable however full its table is", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({ [PRESENCE_VIEW]: presenceView() })
    );

    const modules = await getHubModules("dossiers");
    const frise = modules.find((m) => m.id === "frise");

    expect(frise).toBeDefined();
    expect(frise?.available).toBe(false);
  });

  // Readiness is declared, so answering it costs nothing — and asking the
  // database about a module we have already decided is unready would be a
  // round trip whose answer is discarded.
  // @req REQ-106 @req REQ-114
  it("settles a module in preparation without touching the database", async () => {
    const available = await isModuleAvailable({
      availability: "data",
      dataSource: "migration_events",
      editorialReadiness: "draft",
    });

    expect(available).toBe(false);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  // The state `static` was the trap: with no table to consult, a static
  // module had no way of being anything but live, which is why the
  // colonisation page could not be marked in preparation at all.
  // @req REQ-106 @req REQ-114
  it("takes a static module off the invitation when it is declared unready", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({ [PRESENCE_VIEW]: presenceView() })
    );

    const modules = await getHubModules("dossiers");

    expect(
      modules.find((m) => m.id === "regards-colonisation")?.available
    ).toBe(false);
    // Its neighbour on the same axis is static too, and stays live: nothing
    // about being static decides this either way.
    expect(modules.find((m) => m.id === "anecdotes")?.available).toBe(true);
  });

  // Listed, always. Withholding the click is the whole of what draft does.
  // @req REQ-106 @req REQ-114
  it("still lists a module in preparation", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({ [PRESENCE_VIEW]: presenceView() })
    );

    const modules = await getHubModules("dossiers");

    expect(modules.map((m) => m.id)).toContain("frise");
    expect(modules.map((m) => m.id)).toContain("regards-colonisation");
  });

  /**
   * The view and the registry are two lists of the same thing, kept in two
   * languages. A source declared here and missing there answers `unknown`
   * forever, which now means "offered" — a silent way to publish a module
   * whose table is empty.
   */
  // @req REQ-106 @req REQ-114
  it("gives every declared data source a row in the presence view", () => {
    // Comments are stripped first: this file argues about the tables it
    // covers at length, and a name mentioned in prose must not pass for a
    // name selected in SQL.
    const sql = readFileSync(PRESENCE_MIGRATION, "utf-8")
      .split("\n")
      .map((line) => line.replace(/--.*$/, ""))
      .join("\n");

    for (const source of DECLARED_DATA_SOURCES) {
      expect(sql, `${source} has no row in ${PRESENCE_VIEW}`).toContain(
        `'${source}'`
      );
    }
    // The one source the view may not read whole: `noms` counts people
    // records only, exactly as the direct probe does.
    expect(sql).toContain("entity_type");
  });
});

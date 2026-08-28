import { describe, it, expect, vi, beforeEach } from "vitest";

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

interface TableResult {
  count: number | null;
  error: { code?: string; message: string } | null;
}

// Builds a fake Supabase client whose `.from(table)` returns a thenable
// query builder resolving to the configured count/error for that table —
// mirroring the real PostgrestFilterBuilder regardless of how many
// .select()/.eq() calls are chained before the final `await`.
function buildSupabaseMock(results: Partial<Record<string, TableResult>>) {
  const from = vi.fn((table: string) => {
    const result: TableResult = results[table] ?? { count: 0, error: null };
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      then: (
        resolve: (value: TableResult) => unknown,
        reject: (reason: unknown) => unknown
      ) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  });

  return { from };
}

const ALL_LIVE_RESULTS: Record<string, TableResult> = {
  afrik_peoples: { count: 5, error: null },
  afrik_countries: { count: 5, error: null },
  afrik_language_families: { count: 5, error: null },
  name_records: { count: 5, error: null },
  migration_events: { count: 5, error: null },
  afrik_people_relations: { count: 5, error: null },
  quiz_questions: { count: 5, error: null },
};

describe("moduleAvailability — REQ-106/REQ-114 data-backed hub availability", () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
  });

  // @req REQ-106 @req REQ-114
  it("marks a data module unavailable when its backing table holds zero rows", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        ...ALL_LIVE_RESULTS,
        afrik_peoples: { count: 0, error: null },
      })
    );

    const modules = await getHubModules("explorer");
    const peuples = modules.find((m) => m.id === "peuples");

    expect(peuples?.available).toBe(false);
  });

  // @req REQ-106 @req REQ-114
  it("marks a data module available when its backing table holds at least one row", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    const explorer = await getHubModules("explorer");
    const comprendre = await getHubModules("comprendre");

    expect(explorer.find((m) => m.id === "pays")?.available).toBe(true);
    expect(comprendre.find((m) => m.id === "noms")?.available).toBe(true);
  });

  // @req REQ-106 @req REQ-114
  it("marks a data module unavailable when its data source is unreachable (error)", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        ...ALL_LIVE_RESULTS,
        migration_events: {
          count: null,
          error: { code: "42P17", message: "infinite recursion detected" },
        },
      })
    );

    const modules = await getHubModules("comprendre");
    const frise = modules.find((m) => m.id === "frise");

    expect(frise?.available).toBe(false);
  });

  // @req REQ-106 @req REQ-114
  it("marks a data module unavailable when the probe throws", async () => {
    const from = vi.fn(() => {
      throw new Error("network unreachable");
    });
    createServerClientMock.mockReturnValue({ from });

    const modules = await getHubModules("explorer");
    const familles = modules.find((m) => m.id === "familles");

    expect(familles?.available).toBe(false);
  });

  // @req REQ-106 @req REQ-114
  it("applies the entity_type=people filter for the noms probe", async () => {
    const eq = vi.fn(() => ({
      then: (resolve: (v: TableResult) => unknown) =>
        Promise.resolve({ count: 3, error: null }).then(resolve),
    }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    createServerClientMock.mockReturnValue({ from });

    await isModuleAvailable({
      availability: "data",
      dataSource: "name_records",
    });

    expect(from).toHaveBeenCalledWith("name_records");
    expect(eq).toHaveBeenCalledWith("entity_type", "people");
  });

  // A wrong table name here would read as "still coming soon" rather than as
  // a broken probe.
  // @req REQ-120
  it("probes the peoples table for the appellations game", async () => {
    const supabase = buildSupabaseMock(ALL_LIVE_RESULTS);
    createServerClientMock.mockReturnValue(supabase);

    const modules = await getHubModules("jouer");

    expect(supabase.from).toHaveBeenCalledWith("afrik_peoples");
    expect(modules.find((m) => m.id === "appellations")?.available).toBe(true);
  });

  // Each game stands on its own table, so one empty source darkens one game
  // and leaves the others alone.
  // @req REQ-120
  it("takes a game off the hub when its own table is empty", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        ...ALL_LIVE_RESULTS,
        afrik_peoples: { count: 0, error: null },
      })
    );

    const modules = await getHubModules("jouer");

    expect(modules.find((m) => m.id === "appellations")?.available).toBe(false);
    expect(modules.find((m) => m.id === "mercator")?.available).toBe(true);
  });

  // @req REQ-106 @req REQ-114
  it("keeps a static module live without ever touching the database", async () => {
    const available = await isModuleAvailable({ availability: "static" });

    expect(available).toBe(true);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  // @req REQ-106 @req REQ-114
  it("surfaces doctrine as live even when every table is empty", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock({}));

    const modules = await getHubModules("comprendre");

    expect(modules.find((m) => m.id === "doctrine")?.available).toBe(true);
    expect(modules.find((m) => m.id === "frise")?.available).toBe(false);
    expect(modules.find((m) => m.id === "noms")?.available).toBe(false);
  });

  // The hub used to drop a module behind a dark flag, so the quiz was
  // missing from a build that had simply not been given a variable. Nothing
  // is dropped now: what a module waits on is its corpus.
  // @req REQ-106 @req REQ-114
  it("lists the quiz whatever the environment says", async () => {
    const original = process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    try {
      const modules = await getHubModules("jouer");

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
        ...ALL_LIVE_RESULTS,
        quiz_questions: { count: 0, error: null },
      })
    );

    const modules = await getHubModules("jouer");
    const quiz = modules.find((m) => m.id === "quiz");

    // Listed and honest, rather than gone: a reader can see the module
    // exists and that it has nothing to serve yet.
    expect(quiz).toBeDefined();
    expect(quiz?.available).toBe(false);
  });

  // @req REQ-106 @req REQ-114
  it("never probes a static module", async () => {
    const available = await isModuleAvailable({ availability: "static" });

    expect(available).toBe(true);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  // A full table says the module has rows, never that the rows are worth
  // reading. The frise is the case that forced the distinction: six sourced
  // events pass any row count and still answer nothing (atlas-charter §3).
  // @req REQ-106 @req REQ-114
  it("keeps a module in preparation unavailable however full its table is", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    const modules = await getHubModules("comprendre");
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
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    const modules = await getHubModules("comprendre");

    expect(
      modules.find((m) => m.id === "regards-colonisation")?.available
    ).toBe(false);
    // Its neighbour on the same axis is static too, and stays live: nothing
    // about being static decides this either way.
    expect(modules.find((m) => m.id === "doctrine")?.available).toBe(true);
  });

  // Listed, always. Withholding the click is the whole of what draft does.
  // @req REQ-106 @req REQ-114
  it("still lists a module in preparation", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    const modules = await getHubModules("comprendre");

    expect(modules.map((m) => m.id)).toContain("frise");
    expect(modules.map((m) => m.id)).toContain("regards-colonisation");
  });
});

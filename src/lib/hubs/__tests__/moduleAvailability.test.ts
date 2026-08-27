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
    expect(comprendre.find((m) => m.id === "frise")?.available).toBe(true);
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

  // A switched-off module is not "coming soon", it is not there. Listing
  // it as Bientôt would promise a route that answers notFound(), and would
  // make the flag indistinguishable from unbuilt work.
  // @req REQ-106 @req REQ-114
  it("drops a flagged module from the hub entirely while its flag is off", async () => {
    const original = process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    try {
      const modules = await getHubModules("jouer");

      expect(modules.map((m) => m.id)).not.toContain("quiz");
      // A game beside it is untouched: the flag settles one module, never
      // the axis.
      expect(modules.map((m) => m.id)).toContain("appellations");
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_FEATURE_QUIZ = original;
      }
    }
  });

  // @req REQ-106 @req REQ-114
  it("lists a flagged module once its flag is on", async () => {
    const original = process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "true";
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    try {
      const modules = await getHubModules("jouer");
      const quiz = modules.find((m) => m.id === "quiz");

      expect(quiz?.available).toBe(true);
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
      } else {
        process.env.NEXT_PUBLIC_FEATURE_QUIZ = original;
      }
    }
  });

  // @req REQ-106 @req REQ-114
  it("never probes a module forced unavailable, regardless of data", () => {
    return isModuleAvailable({ availability: "unavailable" }).then(
      (available) => {
        expect(available).toBe(false);
        expect(createServerClientMock).not.toHaveBeenCalled();
      }
    );
  });

  // A switched-off module is absent, not empty: asking the corpus about it
  // would spend a round trip to answer a question the flag already settled.
  // @req REQ-106 @req REQ-114
  it("never probes a flagged module whose flag is off", async () => {
    const original = process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;

    try {
      const available = await isModuleAvailable({
        availability: "flagged",
        featureFlag: "quiz",
      });

      expect(available).toBe(false);
      expect(createServerClientMock).not.toHaveBeenCalled();
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_FEATURE_QUIZ = original;
      }
    }
  });

  // @req REQ-106 @req REQ-114
  it("brings a flagged module live once its flag is on, without a probe", async () => {
    const original = process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "true";

    try {
      const available = await isModuleAvailable({
        availability: "flagged",
        featureFlag: "quiz",
      });

      expect(available).toBe(true);
      expect(createServerClientMock).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
      } else {
        process.env.NEXT_PUBLIC_FEATURE_QUIZ = original;
      }
    }
  });
});

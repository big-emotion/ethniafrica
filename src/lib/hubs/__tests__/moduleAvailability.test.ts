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

  // Both games shipped as inert placeholders, so a wrong table name here
  // would read as "still coming soon" rather than as a broken probe.
  // @req REQ-120
  it("probes the relations table for the liens game", async () => {
    const supabase = buildSupabaseMock(ALL_LIVE_RESULTS);
    createServerClientMock.mockReturnValue(supabase);

    const modules = await getHubModules("jouer");

    expect(supabase.from).toHaveBeenCalledWith("afrik_people_relations");
    expect(modules.find((m) => m.id === "liens")?.available).toBe(true);
  });

  // @req REQ-120
  it("probes the question bank for the quiz module", async () => {
    const supabase = buildSupabaseMock(ALL_LIVE_RESULTS);
    createServerClientMock.mockReturnValue(supabase);

    const modules = await getHubModules("jouer");

    expect(supabase.from).toHaveBeenCalledWith("quiz_questions");
    expect(modules.find((m) => m.id === "quiz")?.available).toBe(true);
  });

  // @req REQ-120
  it("takes a game off the hub when its own table is empty", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        ...ALL_LIVE_RESULTS,
        quiz_questions: { count: 0, error: null },
      })
    );

    const modules = await getHubModules("jouer");

    expect(modules.find((m) => m.id === "quiz")?.available).toBe(false);
    expect(modules.find((m) => m.id === "liens")?.available).toBe(true);
  });

  // @req REQ-106 @req REQ-114
  it("keeps a static module live without ever touching the database", async () => {
    const available = await isModuleAvailable({ availability: "static" });

    expect(available).toBe(true);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  // @req REQ-106 @req REQ-114
  it("surfaces doctrine and about as live even when every table is empty", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock({}));

    const modules = await getHubModules("comprendre");

    expect(modules.find((m) => m.id === "doctrine")?.available).toBe(true);
    expect(modules.find((m) => m.id === "about")?.available).toBe(true);
    expect(modules.find((m) => m.id === "frise")?.available).toBe(false);
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
});

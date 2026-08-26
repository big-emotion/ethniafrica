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

    const modules = await getHubModules("peuples");
    const peuples = modules.find((m) => m.id === "peuples");

    expect(peuples?.available).toBe(false);
  });

  // @req REQ-106 @req REQ-114
  it("marks a data module available when its backing table holds at least one row", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    const modules = await getHubModules("pays");
    const pays = modules.find((m) => m.id === "pays");
    const frise = modules.find((m) => m.id === "frise");

    expect(pays?.available).toBe(true);
    expect(frise?.available).toBe(true);
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

    const modules = await getHubModules("pays");
    const frise = modules.find((m) => m.id === "frise");

    expect(frise?.available).toBe(false);
  });

  // @req REQ-106 @req REQ-114
  it("marks a data module unavailable when the probe throws", async () => {
    const from = vi.fn(() => {
      throw new Error("network unreachable");
    });
    createServerClientMock.mockReturnValue({ from });

    const modules = await getHubModules("familles");
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

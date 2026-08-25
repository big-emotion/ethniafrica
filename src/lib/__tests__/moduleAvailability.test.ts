import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLocalizedRoute } from "@/lib/routing";

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

import { getHomeModules } from "@/lib/moduleAvailability";

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

describe("moduleAvailability.getHomeModules — REQ-106 data-backed availability", () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
  });

  // @req REQ-106
  it("marks a data module unavailable, with no link, when its backing table holds zero rows", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        ...ALL_LIVE_RESULTS,
        afrik_peoples: { count: 0, error: null },
      })
    );

    const modules = await getHomeModules("fr");
    const peuples = modules.find((module) => module.id === "peuples");

    expect(peuples?.state).toBe("soon");
    expect(peuples?.href).toBeNull();
  });

  // @req REQ-106
  it("marks a data module unavailable when its data source is unreachable", async () => {
    createServerClientMock.mockReturnValue(
      buildSupabaseMock({
        ...ALL_LIVE_RESULTS,
        afrik_countries: {
          count: null,
          error: { code: "42P17", message: "infinite recursion detected" },
        },
      })
    );

    const modules = await getHomeModules("fr");
    const pays = modules.find((module) => module.id === "pays");

    expect(pays?.state).toBe("soon");
    expect(pays?.href).toBeNull();
  });

  // @req REQ-106
  it("marks a data module unavailable when the probe throws", async () => {
    const from = vi.fn(() => {
      throw new Error("network unreachable");
    });
    createServerClientMock.mockReturnValue({ from });

    const modules = await getHomeModules("fr");

    for (const dataModule of modules.filter(
      (candidate) =>
        candidate.id !== "recherche" &&
        candidate.id !== "doctrine" &&
        candidate.id !== "about" &&
        candidate.id !== "liens" &&
        candidate.id !== "comparer"
    )) {
      expect(dataModule.state).toBe("soon");
      expect(dataModule.href).toBeNull();
    }
  });

  // @req REQ-106
  it("links a data module to its route once its backing table holds at least one row", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    const modules = await getHomeModules("fr");
    const familles = modules.find((module) => module.id === "familles");

    expect(familles?.state).toBe("live");
    expect(familles?.href).toBe(getLocalizedRoute("fr", "families"));
  });

  // @req REQ-106
  it("filters name_records probes to entity_type=people, mirroring listNames", async () => {
    const supabase = buildSupabaseMock(ALL_LIVE_RESULTS);
    createServerClientMock.mockReturnValue(supabase);

    await getHomeModules("fr");

    expect(supabase.from).toHaveBeenCalledWith("name_records");
    const nameRecordsBuilder = supabase.from.mock.results.find(
      (_, index) => supabase.from.mock.calls[index][0] === "name_records"
    )?.value;
    expect(nameRecordsBuilder.eq).toHaveBeenCalledWith("entity_type", "people");
  });

  // ETNI-1189/REQ-106: the picker built under PR #338 is not wired into any
  // route — the comparator must never present as available, even when every
  // data source is populated.
  // @req REQ-106
  it("never presents the comparator as available, even with all data sources populated", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    const modules = await getHomeModules("fr");
    const comparer = modules.find((module) => module.id === "comparer");

    expect(comparer?.state).toBe("soon");
    expect(comparer?.href).toBeNull();
  });

  // @req REQ-106
  it("keeps static-content modules live from route resolution alone, without probing a table", async () => {
    const supabase = buildSupabaseMock(ALL_LIVE_RESULTS);
    createServerClientMock.mockReturnValue(supabase);

    const modules = await getHomeModules("fr");

    for (const id of ["recherche", "doctrine", "about"]) {
      const staticModule = modules.find((candidate) => candidate.id === id);
      expect(staticModule?.state).toBe("live");
    }
    expect(supabase.from).not.toHaveBeenCalledWith("editorial_doctrine");
  });

  // @req REQ-106
  it("keeps the routeless invisible-links card soon without probing any table", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    const modules = await getHomeModules("fr");
    const liens = modules.find((module) => module.id === "liens");

    expect(liens?.state).toBe("soon");
    expect(liens?.href).toBeNull();
  });

  // @req REQ-106
  it("caches each data-source probe (DEC-018)", async () => {
    createServerClientMock.mockReturnValue(buildSupabaseMock(ALL_LIVE_RESULTS));

    await getHomeModules("fr");

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["home-module-availability"],
      { revalidate: 60 }
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "../../../server";
import { SITEMAP_ID_PAGE_SIZE, getSitemapEntityIds } from "../sitemapEntries";

/**
 * A Supabase double that answers `.range(start, end)` out of a per-table
 * fixture, the way PostgREST does. Building it this way rather than stubbing a
 * single resolved value is the point: a walker that ignores its range, or
 * stops after the first page, cannot pass against it.
 */
function supabaseServing(rowsByTable: Record<string, { id: string }[]>) {
  let table = "";
  const client = {
    from: vi.fn((name: string) => {
      table = name;
      return client;
    }),
    select: vi.fn(() => client),
    order: vi.fn(() => client),
    range: vi.fn(async (start: number, end: number) => ({
      data: (rowsByTable[table] ?? []).slice(start, end + 1),
      error: null,
    })),
  };
  return client;
}

function ids(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${String(i).padStart(4, "0")}`,
  }));
}

describe("sitemap entity ids", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-110
  it("returns every id of each entity type", async () => {
    const client = supabaseServing({
      afrik_peoples: ids("PPL_", 3),
      afrik_countries: ids("C", 2),
      afrik_language_families: ids("FLG_", 1),
      afrik_languages: ids("bam", 2),
      afrik_patronymes: ids("PAT_", 1),
    });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    const entries = await getSitemapEntityIds();

    expect(entries.peoples).toHaveLength(3);
    expect(entries.countries).toEqual(["C0000", "C0001"]);
    expect(entries.families).toEqual(["FLG_0000"]);
    expect(entries.languages).toEqual(["bam0000", "bam0001"]);
    expect(entries.patronymes).toEqual(["PAT_0000"]);
  });

  // An unranged select is silently capped at 1000 rows server-side. The corpus
  // sits at 789 peoples today, so the bug would not show until the day someone
  // loads the 1001st fiche — and then it would drop fiches from the sitemap
  // with no error anywhere.
  // @req REQ-110
  it("walks past the row ceiling an unranged select would hit", async () => {
    const client = supabaseServing({
      afrik_peoples: ids("PPL_", SITEMAP_ID_PAGE_SIZE * 2 + 7),
      afrik_countries: [],
      afrik_language_families: [],
      afrik_languages: [],
      afrik_patronymes: [],
    });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    const entries = await getSitemapEntityIds();

    expect(entries.peoples).toHaveLength(SITEMAP_ID_PAGE_SIZE * 2 + 7);
    expect(new Set(entries.peoples).size).toBe(entries.peoples.length);
  });

  // @req REQ-110
  it("stops on the first short page rather than polling an empty table", async () => {
    const client = supabaseServing({
      afrik_peoples: ids("PPL_", 5),
      afrik_countries: [],
      afrik_language_families: [],
      afrik_languages: [],
      afrik_patronymes: [],
    });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    await getSitemapEntityIds();

    // One request per table, since each first page came back short.
    expect(client.range).toHaveBeenCalledTimes(5);
    expect(client.range).toHaveBeenCalledWith(0, SITEMAP_ID_PAGE_SIZE - 1);
  });

  // The sitemap is a build-time artefact on a route that must not 500. A
  // database that is unreachable costs the entity URLs, not the whole file.
  // @req REQ-110
  it("yields empty lists rather than throwing when a table errors", async () => {
    const client = {
      from: vi.fn(() => client),
      select: vi.fn(() => client),
      order: vi.fn(() => client),
      range: vi.fn(async () => ({ data: null, error: { message: "down" } })),
    };
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    await expect(getSitemapEntityIds()).resolves.toEqual({
      peoples: [],
      countries: [],
      families: [],
      languages: [],
      patronymes: [],
    });
  });

  // A database that never answers reaches this walk as a throw, not as an
  // `{ error }`: the deadline in requestDeadline.ts aborts the fetch and
  // Supabase rejects. Both are the same outcome for a sitemap, so an
  // exception must not escape the walk either.
  // @req REQ-110
  it("yields empty lists rather than throwing when a query rejects", async () => {
    const client = {
      from: vi.fn(() => client),
      select: vi.fn(() => client),
      order: vi.fn(() => client),
      range: vi.fn(async () => {
        throw new Error("The operation was aborted");
      }),
    };
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    await expect(getSitemapEntityIds()).resolves.toEqual({
      peoples: [],
      countries: [],
      families: [],
      languages: [],
      patronymes: [],
    });
  });

  // @req REQ-110
  it("yields empty lists when the client itself cannot be built", async () => {
    (
      createServerClient as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new Error("missing SUPABASE_URL");
    });

    await expect(getSitemapEntityIds()).resolves.toEqual({
      peoples: [],
      countries: [],
      families: [],
      languages: [],
      patronymes: [],
    });
  });
});

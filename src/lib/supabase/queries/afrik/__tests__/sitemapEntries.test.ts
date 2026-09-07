import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "../../../server";
import { SITEMAP_ID_PAGE_SIZE, getSitemapEntityIds } from "../sitemapEntries";

interface FixtureRow {
  id: string;
  content?: unknown;
}

/**
 * A Supabase double that answers `.range(start, end)` out of a per-table
 * fixture, the way PostgREST does. Building it this way rather than stubbing a
 * single resolved value is the point: a walker that ignores its range, or
 * stops after the first page, cannot pass against it.
 *
 * `failingTables` names the tables that answer with an error instead, so a
 * partial outage — the names table down while the other four answer — can be
 * staged without a second double. `selectsByTable` records the column list each
 * table was asked for, since which table pays for the heavier select is part of
 * what the walk owes.
 */
function supabaseServing(
  rowsByTable: Record<string, FixtureRow[]>,
  failingTables: string[] = []
) {
  let table = "";
  const selectsByTable: Record<string, string[]> = {};
  const client = {
    selectsByTable,
    from: vi.fn((name: string) => {
      table = name;
      return client;
    }),
    select: vi.fn((columns: string) => {
      (selectsByTable[table] ??= []).push(columns);
      return client;
    }),
    order: vi.fn(() => client),
    range: vi.fn(async (start: number, end: number) =>
      failingTables.includes(table)
        ? { data: null, error: { message: `${table} is down` } }
        : {
            data: (rowsByTable[table] ?? []).slice(start, end + 1),
            error: null,
          }
    ),
  };
  return client;
}

function ids(prefix: string, count: number): FixtureRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${String(i).padStart(4, "0")}`,
  }));
}

/** A name dossier citing one source at the given tier. */
function nameCiting(id: string, tier: string): FixtureRow {
  return { id, content: { sources: [{ title: `Dossier ${id}`, tier }] } };
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
      afrik_patronymes: [nameCiting("PAT_0000", "referenced")],
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

  // A name resting only on unverified sources is published and readable — it
  // is submitted to search engines that it is not, since an index entry is a
  // claim of standing the dossier cannot back.
  // @req REQ-147
  it("submits only the names whose best source tier is referenced or official", async () => {
    const client = supabaseServing({
      afrik_peoples: [],
      afrik_countries: [],
      afrik_language_families: [],
      afrik_languages: [],
      afrik_patronymes: [
        nameCiting("PAT_OFFICIAL", "official"),
        nameCiting("PAT_REFERENCED", "referenced"),
        nameCiting("PAT_UNVERIFIED", "unverified"),
      ],
    });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    const entries = await getSitemapEntityIds();

    expect(entries.patronymes).toEqual(["PAT_OFFICIAL", "PAT_REFERENCED"]);
  });

  // @req REQ-147
  it("leaves out a name whose dossier carries no readable source", async () => {
    const client = supabaseServing({
      afrik_peoples: [],
      afrik_countries: [],
      afrik_language_families: [],
      afrik_languages: [],
      afrik_patronymes: [
        nameCiting("PAT_CITED", "official"),
        { id: "PAT_NO_SOURCES", content: { sources: [] } },
        { id: "PAT_NO_CONTENT", content: null },
        { id: "PAT_UNTITLED", content: { sources: [{ tier: "official" }] } },
      ],
    });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    const entries = await getSitemapEntityIds();

    expect(entries.patronymes).toEqual(["PAT_CITED"]);
  });

  // @req REQ-147
  it("keeps the other entity ids when the names query fails", async () => {
    const client = supabaseServing(
      {
        afrik_peoples: ids("PPL_", 2),
        afrik_countries: ids("C", 1),
        afrik_language_families: ids("FLG_", 1),
        afrik_languages: ids("bam", 1),
        afrik_patronymes: [nameCiting("PAT_OFFICIAL", "official")],
      },
      ["afrik_patronymes"]
    );
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    await expect(getSitemapEntityIds()).resolves.toEqual({
      peoples: ["PPL_0000", "PPL_0001"],
      countries: ["C0000"],
      families: ["FLG_0000"],
      languages: ["bam0000"],
      patronymes: [],
    });
  });

  // The tier threshold is a name-fiche rule. The other four entity types have
  // no `content` column read here, and widening their select to fetch one
  // would cost the whole corpus for a filter that does not apply to them.
  // @req REQ-147
  it("filters no entity type other than the names", async () => {
    const client = supabaseServing({
      afrik_peoples: ids("PPL_", 3),
      afrik_countries: ids("C", 2),
      afrik_language_families: ids("FLG_", 2),
      afrik_languages: ids("bam", 2),
      afrik_patronymes: [],
    });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      client
    );

    const entries = await getSitemapEntityIds();

    expect(entries.peoples).toHaveLength(3);
    expect(entries.countries).toHaveLength(2);
    expect(entries.families).toHaveLength(2);
    expect(entries.languages).toHaveLength(2);

    expect(client.selectsByTable).toEqual({
      afrik_peoples: ["id"],
      afrik_countries: ["id"],
      afrik_language_families: ["id"],
      afrik_languages: ["id"],
      afrik_patronymes: ["id, content"],
    });
  });
});

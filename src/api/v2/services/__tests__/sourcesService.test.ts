import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import { listSources, getSourceById } from "../sources";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildListQuery(
  rows: Array<Record<string, unknown>>,
  count: number
): FakeQuery {
  const result = { data: rows, error: null, count };
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn(() => Promise.resolve(result));
  return query;
}

function buildSingleQuery(row: Record<string, unknown> | null): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
  return query;
}

describe("sources service", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  describe("listSources", () => {
    // @req REQ-093
    it("projects normalized registry fields without manufacturing offline URLs", async () => {
      const row = {
        id: "33333333-3333-3333-3333-333333333333",
        source_key: "archive-cameroon-1912",
        title: "Archives nationales du Cameroun, dossier 1912",
        url: null,
        source_kind: "archive",
        tier: "referenced",
        identifiers: { callNumber: "ACM-1912-7" },
        author: null,
        year: 1912,
        publisher: "Archives nationales du Cameroun",
      };
      const query = buildListQuery([row], 1);
      fromMock.mockReturnValue(query);

      const result = await listSources({ page: 1, perPage: 20 });

      expect(result.data[0]).toMatchObject({
        sourceKey: "archive-cameroon-1912",
        sourceKind: "archive",
        tier: "referenced",
        identifiers: { callNumber: "ACM-1912-7" },
        url: null,
      });
    });

    it("queries the `sources` table with the requested page slice", async () => {
      const row = {
        id: "11111111-1111-1111-1111-111111111111",
        title: "World Bank Open Data",
        url: "https://data.worldbank.org",
        tier: "official",
        pinned_url: null,
        year: 2024,
        author: null,
        publisher: "World Bank",
        resolvable: true,
        last_verified_at: "2026-01-01T00:00:00.000Z",
      };
      const query = buildListQuery([row], 1);
      fromMock.mockReturnValue(query);

      const result = await listSources({ page: 2, perPage: 10 });

      expect(fromMock).toHaveBeenCalledWith("sources");
      expect(query.range).toHaveBeenCalledWith(10, 19);
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: row.id,
        title: row.title,
        tier: "official",
        pinnedUrl: null,
        publisher: "World Bank",
        resolvable: true,
        lastVerifiedAt: "2026-01-01T00:00:00.000Z",
      });
    });

    // @req REQ-092
    it("derives the authorized-source policy outcome from the source URL", async () => {
      const row = {
        id: "33333333-3333-3333-3333-333333333333",
        title: "Glottolog",
        url: "https://glottolog.org/resource/languoid/id/yoru1245",
      };
      const query = buildListQuery([row], 1);
      fromMock.mockReturnValue(query);

      const result = await listSources({ page: 1, perPage: 20 });

      expect(result.data[0]).toMatchObject({
        policy: {
          key: "glottolog",
          tier: "official",
          sourceKind: "linguistic_reference",
        },
      });
    });

    it("falls back gracefully when extended columns are missing (pre-014)", async () => {
      const row = {
        id: "22222222-2222-2222-2222-222222222222",
        title: "Pre-014 source",
        url: null,
      };
      const query = buildListQuery([row], 1);
      fromMock.mockReturnValue(query);

      const result = await listSources({ page: 1, perPage: 20 });

      expect(result.data[0]).toMatchObject({
        id: row.id,
        title: "Pre-014 source",
        tier: null,
        pinnedUrl: null,
        year: null,
        author: null,
        publisher: null,
        resolvable: null,
        lastVerifiedAt: null,
      });
    });

    it("throws on supabase errors", async () => {
      const query: FakeQuery = {} as FakeQuery;
      query.select = vi.fn(() => query);
      query.order = vi.fn(() => query);
      query.range = vi.fn(() =>
        Promise.resolve({
          data: null,
          error: { message: "boom" },
          count: null,
        })
      );
      fromMock.mockReturnValue(query);

      await expect(listSources({ page: 1, perPage: 20 })).rejects.toThrow(
        /boom/
      );
    });
  });

  describe("getSourceById", () => {
    it("returns the mapped source", async () => {
      const row = {
        id: "11111111-1111-1111-1111-111111111111",
        title: "UN Population",
        url: "https://population.un.org",
        pinned_url: "https://population.un.org/snapshot",
        year: 2025,
        author: null,
        publisher: "UN DESA",
        resolvable: true,
        last_verified_at: "2026-02-01T00:00:00.000Z",
      };
      const query = buildSingleQuery(row);
      fromMock.mockReturnValue(query);

      const result = await getSourceById(row.id);

      expect(fromMock).toHaveBeenCalledWith("sources");
      expect(query.eq).toHaveBeenCalledWith("id", row.id);
      expect(result).toMatchObject({
        id: row.id,
        publisher: "UN DESA",
        pinnedUrl: "https://population.un.org/snapshot",
      });
    });

    it("returns null when not found", async () => {
      const query = buildSingleQuery(null);
      fromMock.mockReturnValue(query);

      const result = await getSourceById(
        "00000000-0000-0000-0000-000000000000"
      );

      expect(result).toBeNull();
    });
  });
});

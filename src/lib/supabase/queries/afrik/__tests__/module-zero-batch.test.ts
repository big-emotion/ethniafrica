/**
 * Tests for Module #0 N+1 batch helpers (ETNI-24).
 *
 * Each helper batches Supabase queries into a constant number of round-trips
 * for N input IDs (with chunked `.in()` only when N exceeds CHUNK_SIZE).
 * The Map<peopleId, T> shape ensures O(1) lookup by caller.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  getSourcesMap,
  getConfidenceMap,
  getFlagsSummaryMap,
  getLatestRevisionMap,
} from "../module-zero-batch";
import { createServerClient } from "../../../server";
import { logger } from "@/lib/api/logger";

interface QueryResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

/**
 * Build a Supabase mock that records every `from()` call and resolves
 * the terminal `.in()` call. The terminal `.in()` returns the next result
 * from the provided queue (one per `from()` invocation). The same chain is
 * reused for all .from() calls — `.select`, `.eq`, `.order` are pass-through.
 */
function buildSupabaseMock(results: QueryResult | QueryResult[]) {
  const queue = Array.isArray(results) ? [...results] : [results];

  const fromSpy = vi.fn();
  const selectSpy = vi.fn();
  const inSpy = vi.fn();
  const orderSpy = vi.fn();
  const eqSpy = vi.fn();

  inSpy.mockImplementation(() => {
    const next = queue.shift();
    return Promise.resolve(next || { data: [], error: null });
  });

  const chain = {
    select: selectSpy,
    in: inSpy,
    order: orderSpy,
    eq: eqSpy,
  };

  selectSpy.mockReturnValue(chain);
  orderSpy.mockReturnValue(chain);
  eqSpy.mockReturnValue(chain);

  fromSpy.mockReturnValue(chain);

  const client = { from: fromSpy };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (createServerClient as any).mockReturnValue(client);

  return { fromSpy, selectSpy, inSpy, orderSpy, eqSpy };
}

function makeIds(n: number): string[] {
  return Array.from(
    { length: n },
    (_, i) => `PPL_TEST_${String(i).padStart(4, "0")}`
  );
}

describe("module-zero-batch helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSourcesMap", () => {
    it("returns an empty Map when peopleIds is empty (no query)", async () => {
      const { fromSpy } = buildSupabaseMock({ data: [], error: null });

      const result = await getSourcesMap([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it("uses two queries (assertions, sources) for non-empty input", async () => {
      const ids = makeIds(50);
      const { fromSpy, inSpy } = buildSupabaseMock([
        {
          data: [
            { entity_id: "PPL_TEST_0000", source_ids: ["sid-1"] },
            { entity_id: "PPL_TEST_0001", source_ids: ["sid-2"] },
          ],
          error: null,
        },
        {
          data: [
            { id: "sid-1", title: "S1", url: null, tier: "academic" },
            { id: "sid-2", title: "S2", url: "https://y", tier: "ngo" },
          ],
          error: null,
        },
      ]);

      await getSourcesMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(2);
      expect(fromSpy).toHaveBeenNthCalledWith(1, "assertions");
      expect(fromSpy).toHaveBeenNthCalledWith(2, "sources");
      expect(inSpy).toHaveBeenNthCalledWith(1, "entity_id", ids);
    });

    it("groups sources by peopleId in the returned Map", async () => {
      buildSupabaseMock([
        {
          data: [
            { entity_id: "PPL_A", source_ids: ["src-1", "src-2"] },
            { entity_id: "PPL_B", source_ids: ["src-3"] },
          ],
          error: null,
        },
        {
          data: [
            {
              id: "src-1",
              title: "Source 1",
              url: "https://x",
              tier: "academic",
            },
            { id: "src-2", title: "Source 2", url: null, tier: null },
            { id: "src-3", title: "Source 3", url: "https://y", tier: "ngo" },
          ],
          error: null,
        },
      ]);

      const result = await getSourcesMap(["PPL_A", "PPL_B"]);

      expect(result.get("PPL_A")).toHaveLength(2);
      expect(result.get("PPL_B")).toHaveLength(1);
      expect(result.get("PPL_A")?.[0].id).toBe("src-1");
      expect(result.get("PPL_A")?.[0].tier).toBe("academic");
    });

    it("skips assertions with empty/null source_ids", async () => {
      buildSupabaseMock([
        {
          data: [
            { entity_id: "PPL_A", source_ids: ["src-1"] },
            { entity_id: "PPL_B", source_ids: null },
            { entity_id: "PPL_C", source_ids: [] },
          ],
          error: null,
        },
        {
          data: [{ id: "src-1", title: "S1", url: null, tier: null }],
          error: null,
        },
      ]);

      const result = await getSourcesMap(["PPL_A", "PPL_B", "PPL_C"]);

      expect(result.get("PPL_A")).toHaveLength(1);
      expect(result.has("PPL_B")).toBe(false);
      expect(result.has("PPL_C")).toBe(false);
    });

    it("chunks .in() into batches of 500 when ids.length > 500", async () => {
      const ids = makeIds(1200);
      // 3 assertion chunks (500 + 500 + 200), then 1 sources lookup.
      const { fromSpy, inSpy } = buildSupabaseMock([
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ]);

      await getSourcesMap(ids);

      // 3 chunked assertions calls + 0 sources calls (no source ids).
      expect(fromSpy).toHaveBeenCalledTimes(3);
      expect(inSpy).toHaveBeenCalledTimes(3);
      expect((inSpy.mock.calls[0][1] as string[]).length).toBe(500);
      expect((inSpy.mock.calls[1][1] as string[]).length).toBe(500);
      expect((inSpy.mock.calls[2][1] as string[]).length).toBe(200);
    });

    it("logs via logger.error and returns empty Map on query error", async () => {
      buildSupabaseMock({ data: null, error: { message: "boom" } });

      const result = await getSourcesMap(["PPL_A"]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(
        (logger.error as unknown as { mock: { calls: unknown[][] } }).mock
          .calls[0][0]
      ).toContain("module-zero-batch.getSourcesMap");
    });
  });

  describe("getConfidenceMap", () => {
    it("returns an empty Map when peopleIds is empty (no query)", async () => {
      const { fromSpy } = buildSupabaseMock({ data: [], error: null });

      const result = await getConfidenceMap([]);

      expect(result.size).toBe(0);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it("queries confidence_scores directly with entity_type filter", async () => {
      const ids = makeIds(50);
      const { fromSpy, inSpy, eqSpy } = buildSupabaseMock({
        data: [],
        error: null,
      });

      await getConfidenceMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(1);
      expect(fromSpy).toHaveBeenCalledWith("confidence_scores");
      expect(eqSpy).toHaveBeenCalledWith("entity_type", "people");
      expect(inSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledWith("entity_id", ids);
    });

    it("maps a single confidence score per peopleId", async () => {
      buildSupabaseMock({
        data: [
          {
            entity_id: "PPL_A",
            score: 0.85,
            source_count: 4,
            avg_source_quality: 0.9,
            last_human_audit_at: "2026-05-01T00:00:00Z",
            open_flag_count: 0,
            recomputed_at: "2026-05-10T00:00:00Z",
          },
          {
            entity_id: "PPL_B",
            score: 0.6,
            source_count: 2,
            avg_source_quality: 0.5,
            last_human_audit_at: null,
            open_flag_count: 1,
            recomputed_at: "2026-05-09T00:00:00Z",
          },
        ],
        error: null,
      });

      const result = await getConfidenceMap(["PPL_A", "PPL_B"]);

      expect(result.get("PPL_A")?.score).toBe(0.85);
      expect(result.get("PPL_A")?.sourceCount).toBe(4);
      expect(result.get("PPL_B")?.openFlagCount).toBe(1);
    });

    it("chunks .in() into batches of 500 when ids.length > 500", async () => {
      const ids = makeIds(1100);
      const { fromSpy, inSpy } = buildSupabaseMock([
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ]);

      await getConfidenceMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(3);
      expect(inSpy).toHaveBeenCalledTimes(3);
      expect((inSpy.mock.calls[0][1] as string[]).length).toBe(500);
      expect((inSpy.mock.calls[2][1] as string[]).length).toBe(100);
    });

    it("logs via logger.error and returns empty Map on query error", async () => {
      buildSupabaseMock({ data: null, error: { message: "boom" } });

      const result = await getConfidenceMap(["PPL_A"]);

      expect(result.size).toBe(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(
        (logger.error as unknown as { mock: { calls: unknown[][] } }).mock
          .calls[0][0]
      ).toContain("module-zero-batch.getConfidenceMap");
    });
  });

  describe("getFlagsSummaryMap", () => {
    it("returns an empty Map when peopleIds is empty (no query)", async () => {
      const { fromSpy } = buildSupabaseMock({ data: [], error: null });

      const result = await getFlagsSummaryMap([]);

      expect(result.size).toBe(0);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it("performs exactly ONE query for 50 IDs", async () => {
      const ids = makeIds(50);
      const { fromSpy, inSpy } = buildSupabaseMock({ data: [], error: null });

      await getFlagsSummaryMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledWith("entity_id", ids);
    });

    it("returns openCount and totalCount per peopleId", async () => {
      buildSupabaseMock({
        data: [
          { entity_id: "PPL_A", status: "pending" },
          { entity_id: "PPL_A", status: "pending" },
          { entity_id: "PPL_A", status: "resolved" },
          { entity_id: "PPL_B", status: "reviewed" },
          { entity_id: "PPL_B", status: "dismissed" },
        ],
        error: null,
      });

      const result = await getFlagsSummaryMap(["PPL_A", "PPL_B"]);

      expect(result.get("PPL_A")).toEqual({ openCount: 2, totalCount: 3 });
      expect(result.get("PPL_B")).toEqual({ openCount: 1, totalCount: 2 });
    });

    it("chunks .in() into batches of 500 when ids.length > 500", async () => {
      const ids = makeIds(1500);
      const { fromSpy, inSpy } = buildSupabaseMock([
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ]);

      await getFlagsSummaryMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(3);
      expect(inSpy).toHaveBeenCalledTimes(3);
    });

    it("logs via logger.error and returns empty Map on query error", async () => {
      buildSupabaseMock({ data: null, error: { message: "boom" } });

      const result = await getFlagsSummaryMap(["PPL_A"]);

      expect(result.size).toBe(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(
        (logger.error as unknown as { mock: { calls: unknown[][] } }).mock
          .calls[0][0]
      ).toContain("module-zero-batch.getFlagsSummaryMap");
    });
  });

  describe("getLatestRevisionMap", () => {
    it("returns an empty Map when peopleIds is empty (no query)", async () => {
      const { fromSpy } = buildSupabaseMock({ data: [], error: null });

      const result = await getLatestRevisionMap([]);

      expect(result.size).toBe(0);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it("performs exactly ONE query for 50 IDs", async () => {
      const ids = makeIds(50);
      const { fromSpy, inSpy } = buildSupabaseMock({ data: [], error: null });

      await getLatestRevisionMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledWith("entity_id", ids);
    });

    it("keeps only the latest revision per peopleId", async () => {
      buildSupabaseMock({
        data: [
          {
            id: "rev-2",
            entity_id: "PPL_A",
            field_path: "content.name",
            new_value: "Latest",
            changed_by: "user-1",
            change_reason: "fix typo",
            created_at: "2026-05-14T10:00:00Z",
          },
          {
            id: "rev-1",
            entity_id: "PPL_A",
            field_path: "content.name",
            new_value: "Older",
            changed_by: "user-2",
            change_reason: "initial",
            created_at: "2026-05-13T10:00:00Z",
          },
          {
            id: "rev-3",
            entity_id: "PPL_B",
            field_path: "content.history",
            new_value: "Foo",
            changed_by: "user-1",
            change_reason: null,
            created_at: "2026-05-12T10:00:00Z",
          },
        ],
        error: null,
      });

      const result = await getLatestRevisionMap(["PPL_A", "PPL_B"]);

      expect(result.get("PPL_A")?.id).toBe("rev-2");
      expect(result.get("PPL_B")?.id).toBe("rev-3");
      expect(result.size).toBe(2);
    });

    it("chunks .in() into batches of 500 when ids.length > 500", async () => {
      const ids = makeIds(1000);
      const { fromSpy, inSpy } = buildSupabaseMock([
        { data: [], error: null },
        { data: [], error: null },
      ]);

      await getLatestRevisionMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(2);
      expect(inSpy).toHaveBeenCalledTimes(2);
      expect((inSpy.mock.calls[0][1] as string[]).length).toBe(500);
      expect((inSpy.mock.calls[1][1] as string[]).length).toBe(500);
    });

    it("logs via logger.error and returns empty Map on query error", async () => {
      buildSupabaseMock({ data: null, error: { message: "boom" } });

      const result = await getLatestRevisionMap(["PPL_A"]);

      expect(result.size).toBe(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(
        (logger.error as unknown as { mock: { calls: unknown[][] } }).mock
          .calls[0][0]
      ).toContain("module-zero-batch.getLatestRevisionMap");
    });
  });
});

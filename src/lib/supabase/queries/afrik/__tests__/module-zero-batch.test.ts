/**
 * Tests for Module #0 N+1 batch helpers (ETNI-24).
 *
 * Each helper MUST perform exactly ONE Supabase query for N input IDs,
 * regardless of N. The Map<peopleId, T> shape ensures O(1) lookup by caller.
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
 * the terminal `.in()` (or `.order().in()`) with the provided result.
 */
function buildSupabaseMock(result: QueryResult) {
  const fromSpy = vi.fn();
  const selectSpy = vi.fn();
  const inSpy = vi.fn();
  const orderSpy = vi.fn();
  const eqSpy = vi.fn();

  // .in() is the terminal call returning the promise.
  inSpy.mockResolvedValue(result);

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
    (_, i) => `PPL_TEST_${String(i).padStart(3, "0")}`
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

    it("performs exactly ONE query for 50 IDs", async () => {
      const ids = makeIds(50);
      const { fromSpy, inSpy } = buildSupabaseMock({ data: [], error: null });

      await getSourcesMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledWith("entity_id", ids);
    });

    it("groups sources by peopleId in the returned Map", async () => {
      const ids = ["PPL_A", "PPL_B"];
      buildSupabaseMock({
        data: [
          {
            entity_id: "PPL_A",
            sources: {
              id: "src-1",
              title: "Source 1",
              url: "https://x",
              type: "academic",
            },
          },
          {
            entity_id: "PPL_A",
            sources: { id: "src-2", title: "Source 2", url: null, type: null },
          },
          {
            entity_id: "PPL_B",
            sources: {
              id: "src-3",
              title: "Source 3",
              url: "https://y",
              type: "ngo",
            },
          },
        ],
        error: null,
      });

      const result = await getSourcesMap(ids);

      expect(result.get("PPL_A")).toHaveLength(2);
      expect(result.get("PPL_B")).toHaveLength(1);
      expect(result.get("PPL_A")?.[0].id).toBe("src-1");
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

    it("performs exactly ONE query for 50 IDs", async () => {
      const ids = makeIds(50);
      const { fromSpy, inSpy } = buildSupabaseMock({ data: [], error: null });

      await getConfidenceMap(ids);

      expect(fromSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledTimes(1);
      expect(inSpy).toHaveBeenCalledWith("entity_id", ids);
    });

    it("maps a single confidence score per peopleId", async () => {
      buildSupabaseMock({
        data: [
          {
            entity_id: "PPL_A",
            confidence_scores: {
              id: "cs-1",
              score: 0.85,
              methodology: "weighted-avg",
            },
          },
          {
            entity_id: "PPL_B",
            confidence_scores: {
              id: "cs-2",
              score: 0.6,
              methodology: "manual",
            },
          },
        ],
        error: null,
      });

      const result = await getConfidenceMap(["PPL_A", "PPL_B"]);

      expect(result.get("PPL_A")?.score).toBe(0.85);
      expect(result.get("PPL_B")?.methodology).toBe("manual");
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
      // 'reviewed' is considered open (not resolved/dismissed); 'dismissed' is closed.
      expect(result.get("PPL_B")).toEqual({ openCount: 1, totalCount: 2 });
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
      // DB returns rows ordered by created_at DESC, so the first row per
      // entity_id is the latest. We assert the helper preserves that.
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

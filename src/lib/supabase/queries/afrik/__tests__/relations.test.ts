/**
 * Tests for the AFRIK relations query layer (Epic 11, Story 11.6, ETNI-507).
 *
 * getRelationsForPeople/getRelationsMap batch-fetch sourced relations (no
 * per-edge queries, NFR3); getDerivedLinguisticLinks derives same-family
 * peoples from the AFRIK hierarchy via one indexed query, excluding peoples
 * already linked by a sourced relation (FR73).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../module-zero-batch", () => ({
  getSourcesMap: vi.fn(),
  getConfidenceMap: vi.fn(),
}));

import {
  getRelationsForPeople,
  getRelationsMap,
  getDerivedLinguisticLinks,
} from "../relations";
import { createServerClient } from "../../../server";
import { getSourcesMap, getConfidenceMap } from "../module-zero-batch";

interface RelationRowFixture {
  id: string;
  relation_type: string;
  people_id_a: string;
  people_id_b: string;
  direction: string;
  period_start_year: number | null;
  period_end_year: number | null;
  period_label: string | null;
  description: string;
}

function relationRow(
  overrides: Partial<RelationRowFixture> = {}
): RelationRowFixture {
  return {
    id: "REL_TEST",
    relation_type: "migratory",
    people_id_a: "PPL_A",
    people_id_b: "PPL_B",
    direction: "bidirectional",
    period_start_year: 1300,
    period_end_year: 1800,
    period_label: "XIVe-XVIIIe siecle",
    description: "test description",
    ...overrides,
  };
}

/**
 * Builds a Supabase mock whose `.from(table)` routing supports:
 *  - "afrik_people_relations": `.select().in("people_id_a"|"people_id_b", ids)`
 *    resolving from a queue (one entry per call), plus `.select().eq(...)`
 *    for the lean self-relations lookup used by getDerivedLinguisticLinks.
 *  - "afrik_peoples": `.select().in("id", ids)` for neighbor hydration, and
 *    `.select().eq("id", pplId).single()` / the family-scoped chain
 *    (`.eq("language_family_id", ...).neq().order().limit()` [+ `.not()`]).
 */
function buildSupabaseMock(options: {
  relationsInQueue?: Array<{ data: unknown[] | null; error: unknown }>;
  relationsEqQueue?: Array<{ data: unknown[] | null; error: unknown }>;
  peoplesInResult?: { data: unknown[] | null; error: unknown };
  peopleSingleResult?: { data: unknown | null; error: unknown };
  familyResult?: { data: unknown[] | null; error: unknown };
}) {
  const {
    relationsInQueue = [],
    relationsEqQueue = [],
    peoplesInResult = { data: [], error: null },
    peopleSingleResult,
    familyResult = { data: [], error: null },
  } = options;

  const inQueue = [...relationsInQueue];
  const eqQueue = [...relationsEqQueue];

  // Single persistent chain for "afrik_peoples" so spies are shared and
  // inspectable across the self-lookup and family-scoped invocations.
  const singleSpy = vi.fn(() =>
    Promise.resolve(peopleSingleResult || { data: null, error: null })
  );
  const limitSpy = vi.fn(() => Promise.resolve(familyResult));
  const orderSpy = vi.fn(() => ({ limit: limitSpy }));
  const notSpy = vi.fn(() => ({ order: orderSpy }));
  const neqSpy = vi.fn(() => ({ order: orderSpy, not: notSpy }));
  const eqSpy = vi.fn(() => ({ single: singleSpy, neq: neqSpy }));
  const inSpy = vi.fn(() => Promise.resolve(peoplesInResult));
  const selectSpy = vi.fn(() => ({ eq: eqSpy, in: inSpy }));
  const peoplesChain = { select: selectSpy };

  const fromSpy = vi.fn((table: string) => {
    if (table === "afrik_people_relations") {
      const chain = {
        select: vi.fn(() => chain),
        in: vi.fn(() =>
          Promise.resolve(inQueue.shift() || { data: [], error: null })
        ),
        eq: vi.fn(() =>
          Promise.resolve(eqQueue.shift() || { data: [], error: null })
        ),
      };
      return chain;
    }

    if (table === "afrik_peoples") {
      return peoplesChain;
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: fromSpy,
  });

  return {
    fromSpy,
    peoples: {
      selectSpy,
      eqSpy,
      neqSpy,
      notSpy,
      orderSpy,
      limitSpy,
      singleSpy,
      inSpy,
    },
  };
}

describe("relations query layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSourcesMap).mockResolvedValue(new Map());
    vi.mocked(getConfidenceMap).mockResolvedValue(new Map());
  });

  describe("getRelationsMap", () => {
    // @req REQ-093
    it("returns an empty Map without querying when peopleIds is empty", async () => {
      const { fromSpy } = buildSupabaseMock({});

      const result = await getRelationsMap([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    // @req REQ-093
    it("batches relations for many peoples in a bounded number of queries (no per-edge fan-out)", async () => {
      const row = relationRow({
        id: "REL_A_B",
        people_id_a: "PPL_A",
        people_id_b: "PPL_B",
      });
      const { fromSpy } = buildSupabaseMock({
        relationsInQueue: [
          { data: [row], error: null },
          { data: [], error: null },
        ],
        peoplesInResult: {
          data: [
            { id: "PPL_A", name_main: "A", language_family_id: "FLG_X" },
            { id: "PPL_B", name_main: "B", language_family_id: "FLG_X" },
          ],
          error: null,
        },
      });

      const ids = Array.from({ length: 50 }, (_, i) => `PPL_${i}`);
      const callsBefore = fromSpy.mock.calls.length;
      const result = await getRelationsMap(ids);
      const callCount = fromSpy.mock.calls.length - callsBefore;

      // Bounded (constant), not O(N) — same call count regardless of N ids.
      expect(callCount).toBeLessThan(10);
      expect(result).toBeInstanceOf(Map);
    });

    // @req REQ-093
    it("hydrates neighbor fiche data and confidence via batch helpers, keyed by peopleId", async () => {
      const row = relationRow({
        id: "REL_A_B",
        people_id_a: "PPL_A",
        people_id_b: "PPL_B",
      });
      buildSupabaseMock({
        relationsInQueue: [
          { data: [row], error: null },
          { data: [], error: null },
        ],
        peoplesInResult: {
          data: [
            { id: "PPL_A", name_main: "A", language_family_id: "FLG_X" },
            { id: "PPL_B", name_main: "B", language_family_id: "FLG_X" },
          ],
          error: null,
        },
      });
      vi.mocked(getSourcesMap).mockResolvedValue(
        new Map([
          [
            "REL_A_B",
            [{ id: "SRC_1", title: "S1", url: null, tier: "primary" }],
          ],
        ])
      );
      vi.mocked(getConfidenceMap).mockResolvedValue(
        new Map([
          [
            "REL_A_B",
            {
              entityId: "REL_A_B",
              score: 0.8,
              sourceCount: 1,
              avgSourceQuality: null,
              lastHumanAuditAt: null,
              openFlagCount: null,
              recomputedAt: null,
            },
          ],
        ])
      );

      const result = await getRelationsMap(["PPL_A", "PPL_B"]);

      const forA = result.get("PPL_A") || [];
      expect(forA).toHaveLength(1);
      expect(forA[0].neighbor).toEqual({
        id: "PPL_B",
        nameMain: "B",
        languageFamilyId: "FLG_X",
      });
      expect(forA[0].confidence).toEqual({ score: 0.8, sourceCount: 1 });
      expect(forA[0].sources).toEqual([
        { id: "SRC_1", title: "S1", url: null, tier: "primary" },
      ]);

      const forB = result.get("PPL_B") || [];
      expect(forB).toHaveLength(1);
      expect(forB[0].neighbor.id).toBe("PPL_A");
    });

    // @req REQ-093
    it("returns an empty Map on a Supabase error, never throws", async () => {
      buildSupabaseMock({
        relationsInQueue: [
          { data: null, error: { message: "boom" } },
          { data: [], error: null },
        ],
      });

      const result = await getRelationsMap(["PPL_A"]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe("getRelationsForPeople", () => {
    // @req REQ-093
    it("returns rows where the people is side A", async () => {
      const row = relationRow({
        id: "REL_A_B",
        people_id_a: "PPL_A",
        people_id_b: "PPL_B",
      });
      buildSupabaseMock({
        relationsInQueue: [
          { data: [row], error: null },
          { data: [], error: null },
        ],
        peoplesInResult: {
          data: [{ id: "PPL_B", name_main: "B", language_family_id: "FLG_X" }],
          error: null,
        },
      });

      const result = await getRelationsForPeople("PPL_A");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("REL_A_B");
      expect(result[0].neighbor.id).toBe("PPL_B");
    });

    // @req REQ-093
    it("returns rows where the people is side B", async () => {
      const row = relationRow({
        id: "REL_C_A",
        people_id_a: "PPL_C",
        people_id_b: "PPL_A",
      });
      buildSupabaseMock({
        relationsInQueue: [
          { data: [], error: null },
          { data: [row], error: null },
        ],
        peoplesInResult: {
          data: [{ id: "PPL_C", name_main: "C", language_family_id: "FLG_X" }],
          error: null,
        },
      });

      const result = await getRelationsForPeople("PPL_A");

      expect(result).toHaveLength(1);
      expect(result[0].neighbor.id).toBe("PPL_C");
    });

    // @req REQ-093
    it("returns an empty array (never null, never throws) for a people with no relations", async () => {
      buildSupabaseMock({
        relationsInQueue: [
          { data: [], error: null },
          { data: [], error: null },
        ],
      });

      const result = await getRelationsForPeople("PPL_LONELY");

      expect(result).toEqual([]);
    });
  });

  describe("getDerivedLinguisticLinks", () => {
    // @req REQ-093
    it("returns same-family peoples via a single indexed query on languageFamilyId", async () => {
      const { fromSpy, peoples } = buildSupabaseMock({
        peopleSingleResult: {
          data: { id: "PPL_A", language_family_id: "FLG_X" },
          error: null,
        },
        relationsEqQueue: [
          { data: [], error: null },
          { data: [], error: null },
        ],
        familyResult: {
          data: [{ id: "PPL_D", name_main: "D", language_family_id: "FLG_X" }],
          error: null,
        },
      });

      const result = await getDerivedLinguisticLinks("PPL_A", 24);

      expect(result).toEqual([
        {
          derived: true,
          basis: "sharedLanguageFamily",
          neighbor: { id: "PPL_D", nameMain: "D", languageFamilyId: "FLG_X" },
        },
      ]);
      expect(fromSpy).toHaveBeenCalledWith("afrik_peoples");
      expect(peoples.eqSpy).toHaveBeenCalledWith("language_family_id", "FLG_X");
      expect(peoples.orderSpy).toHaveBeenCalledTimes(1);
      expect(peoples.limitSpy).toHaveBeenCalledWith(24);
    });

    // @req REQ-093
    it("excludes peoples already linked by a sourced relation", async () => {
      const { peoples } = buildSupabaseMock({
        peopleSingleResult: {
          data: { id: "PPL_A", language_family_id: "FLG_X" },
          error: null,
        },
        relationsEqQueue: [
          {
            data: [{ people_id_a: "PPL_A", people_id_b: "PPL_SOURCED" }],
            error: null,
          },
          { data: [], error: null },
        ],
        familyResult: {
          data: [{ id: "PPL_D", name_main: "D", language_family_id: "FLG_X" }],
          error: null,
        },
      });

      const result = await getDerivedLinguisticLinks("PPL_A", 24);

      // Asserts the exclusion ids are actually computed from the sourced
      // relation and passed into the `.not("id", "in", ...)` filter — not
      // just that the (mocked) family result happens to omit them.
      expect(peoples.notSpy).toHaveBeenCalledWith(
        "id",
        "in",
        expect.stringContaining("PPL_SOURCED")
      );
      expect(result.some((link) => link.neighbor.id === "PPL_SOURCED")).toBe(
        false
      );
    });

    // @req REQ-093
    it("respects the limit parameter", async () => {
      const { peoples } = buildSupabaseMock({
        peopleSingleResult: {
          data: { id: "PPL_A", language_family_id: "FLG_X" },
          error: null,
        },
        relationsEqQueue: [
          { data: [], error: null },
          { data: [], error: null },
        ],
        familyResult: { data: [], error: null },
      });

      await getDerivedLinguisticLinks("PPL_A", 5);

      expect(peoples.limitSpy).toHaveBeenCalledWith(5);
    });

    // @req REQ-093
    it("returns an empty array (never null, never throws) for a people with no family peers", async () => {
      buildSupabaseMock({
        peopleSingleResult: {
          data: { id: "PPL_A", language_family_id: "FLG_LONE" },
          error: null,
        },
        relationsEqQueue: [
          { data: [], error: null },
          { data: [], error: null },
        ],
        familyResult: { data: [], error: null },
      });

      const result = await getDerivedLinguisticLinks("PPL_A", 24);

      expect(result).toEqual([]);
    });

    // @req REQ-093
    it("returns an empty array when the people itself is unknown", async () => {
      buildSupabaseMock({
        peopleSingleResult: {
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        },
      });

      const result = await getDerivedLinguisticLinks("PPL_UNKNOWN", 24);

      expect(result).toEqual([]);
    });
  });
});

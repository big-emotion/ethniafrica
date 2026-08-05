import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/api/logger";
import { loadAllRelationFiles, loadRelations } from "../relationJsonLoader";

// ─── fixtures ─────────────────────────────────────────────────────────────

function validRelationFile(overrides: Record<string, unknown> = {}) {
  return {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "relation",
      directives: "Voir DIRECTIVES-AFRIK.md pour les règles complètes.",
    },
    id: "REL_TEST_COMMERCIAL_01",
    relationType: "commercial",
    peopleIdA: "PPL_TEST_A",
    peopleIdB: "PPL_TEST_B",
    direction: "bidirectional",
    period: {
      startYear: 1700,
      endYear: 1874,
      label: "XVIIIe-XIXe siècle",
    },
    description: "Échanges commerciaux illustratifs pour test.",
    sources: [
      {
        title: "Titre illustratif Tier 2",
        author: "Auteur illustratif",
        year: 2019,
        url: "https://example.org/source-tier-2-primary",
        tier: 2,
        notes: "Vérifié via Wikipedia FR + EN (illustratif).",
      },
    ],
    ...overrides,
  };
}

function writeRelationFile(
  root: string,
  fileName: string,
  data: Record<string, unknown>
) {
  const dir = join(root, "relations");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(data));
}

// ─── Supabase test double ──────────────────────────────────────────────────

interface SourceRow {
  id: string;
  title: string;
  author?: string;
  year?: number;
  url?: string;
  tier?: string;
  notes?: string | null;
}

interface AssertionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  field_path: string;
  statement?: string;
  source_ids?: string[];
}

interface RelationRow {
  id: string;
  relation_type: string;
  people_id_a: string;
  people_id_b: string;
  direction: string;
  period_start_year: number | null;
  period_end_year: number | null;
  period_label: string;
  description: string;
  [key: string]: unknown;
}

interface SupabaseDoubleOptions {
  rejectRelationId?: string;
  rejectConfidenceId?: string;
}

function createSupabaseDouble(options: SupabaseDoubleOptions = {}) {
  const sources: SourceRow[] = [];
  const assertions: AssertionRow[] = [];
  const relations: RelationRow[] = [];
  const confidenceCalls: Array<{ p_entity_type: string; p_entity_id: string }> =
    [];
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const from = vi.fn((table: string) => {
    if (table === "sources") {
      return {
        upsert: vi.fn((row: Omit<SourceRow, "id">) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const existing = sources.find((s) => s.title === row.title);
              if (existing) {
                Object.assign(existing, row);
                return { data: { id: existing.id }, error: null };
              }
              const created = { id: nextId("src"), ...row };
              sources.push(created);
              return { data: { id: created.id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === "assertions") {
      return {
        select: vi.fn(() => {
          const filters: Record<string, unknown> = {};
          const builder = {
            eq: vi.fn((col: string, value: unknown) => {
              filters[col] = value;
              return builder;
            }),
            maybeSingle: vi.fn(async () => {
              const existing = assertions.find(
                (a) =>
                  a.entity_type === filters.entity_type &&
                  a.entity_id === filters.entity_id &&
                  a.field_path === filters.field_path
              );
              return { data: existing ?? null, error: null };
            }),
          };
          return builder;
        }),
        update: vi.fn((patch: Partial<AssertionRow>) => ({
          eq: vi.fn(async (_col: string, id: string) => {
            const existing = assertions.find((a) => a.id === id);
            if (existing) Object.assign(existing, patch);
            return { error: null };
          }),
        })),
        insert: vi.fn((row: Omit<AssertionRow, "id">) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const created = { id: nextId("assert"), ...row };
              assertions.push(created);
              return { data: { id: created.id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === "afrik_people_relations") {
      return {
        upsert: vi.fn(async (row: RelationRow) => {
          if (options.rejectRelationId && row.id === options.rejectRelationId) {
            return {
              error: { message: `relation ${row.id} rejected (test double)` },
            };
          }

          const index = relations.findIndex(
            (candidate) => candidate.id === row.id
          );
          if (index === -1) {
            relations.push(row);
          } else {
            relations[index] = row;
          }
          return { error: null };
        }),
      };
    }

    throw new Error(`Unexpected table in test double: ${table}`);
  });

  const rpc = vi.fn(
    async (
      fn: string,
      args: { p_entity_type: string; p_entity_id: string }
    ) => {
      if (fn !== "recompute_confidence") {
        throw new Error(`Unexpected rpc in test double: ${fn}`);
      }
      confidenceCalls.push(args);
      if (
        options.rejectConfidenceId &&
        args.p_entity_id === options.rejectConfidenceId
      ) {
        return {
          error: { message: "recompute_confidence failed (test double)" },
        };
      }
      return { error: null };
    }
  );

  return {
    client: { from, rpc },
    sources,
    assertions,
    relations,
    confidenceCalls,
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("relationJsonLoader", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_relations_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("loadAllRelationFiles", () => {
    // @req REQ-032
    it("loads a valid relation file from a real fixture", () => {
      writeRelationFile(
        tmpDir,
        "REL_TEST_COMMERCIAL_01.json",
        validRelationFile()
      );

      const relations = loadAllRelationFiles(tmpDir);

      expect(relations).toHaveLength(1);
      expect(relations[0].id).toBe("REL_TEST_COMMERCIAL_01");
      expect(relations[0].peopleIdA).toBe("PPL_TEST_A");
      expect(relations[0].peopleIdB).toBe("PPL_TEST_B");
    });

    // @req REQ-032
    it("skips a file failing the strict model and logs the error", () => {
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      writeRelationFile(
        tmpDir,
        "REL_INVALID.json",
        validRelationFile({ sources: [] }) // invalid: at least one source required
      );

      const relations = loadAllRelationFiles(tmpDir);

      expect(relations).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    // @req REQ-032
    it("returns an empty array when the relations directory is absent", () => {
      expect(loadAllRelationFiles(join(tmpDir, "missing"))).toEqual([]);
    });
  });

  describe("loadRelations", () => {
    // @req REQ-032
    it("upserts sources, one assertion per relation, the relation row, and seeds confidence_scores", async () => {
      const database = createSupabaseDouble();
      writeRelationFile(
        tmpDir,
        "REL_TEST_COMMERCIAL_01.json",
        validRelationFile()
      );
      const records = loadAllRelationFiles(tmpDir);

      const report = await loadRelations(database.client as never, records);

      expect(report.total).toBe(1);
      expect(report.inserted).toBe(1);
      expect(report.errors).toEqual([]);

      expect(database.sources).toHaveLength(1);
      expect(database.assertions).toHaveLength(1);
      expect(database.assertions[0]).toMatchObject({
        entity_type: "relation",
        entity_id: "REL_TEST_COMMERCIAL_01",
        field_path: "record",
      });
      expect(database.assertions[0].source_ids).toHaveLength(1);

      expect(database.relations).toHaveLength(1);
      expect(database.relations[0]).toMatchObject({
        id: "REL_TEST_COMMERCIAL_01",
        relation_type: "commercial",
        people_id_a: "PPL_TEST_A",
        people_id_b: "PPL_TEST_B",
        direction: "bidirectional",
      });

      expect(database.confidenceCalls).toEqual([
        { p_entity_type: "relation", p_entity_id: "REL_TEST_COMMERCIAL_01" },
      ]);
    });

    // @req REQ-032
    it("dedups a source cited by more than one relation via the title constraint", async () => {
      const database = createSupabaseDouble();
      const sharedSource = {
        title: "Shared Tier 1 Source",
        author: "SIL International",
        year: 2024,
        url: "https://example.org/shared",
        tier: 1,
        notes: "",
      };
      const relationA = validRelationFile({
        id: "REL_TEST_COMMERCIAL_01",
        sources: [sharedSource],
      });
      const relationB = validRelationFile({
        id: "REL_TEST_COMMERCIAL_02",
        peopleIdA: "PPL_TEST_C",
        peopleIdB: "PPL_TEST_D",
        sources: [sharedSource],
      });
      writeRelationFile(tmpDir, "REL_TEST_COMMERCIAL_01.json", relationA);
      writeRelationFile(tmpDir, "REL_TEST_COMMERCIAL_02.json", relationB);
      const records = loadAllRelationFiles(tmpDir);

      const report = await loadRelations(database.client as never, records);

      expect(report.inserted).toBe(2);
      expect(database.sources).toHaveLength(1);
      expect(database.relations).toHaveLength(2);
    });

    // @req REQ-032
    it("is idempotent on re-run: no duplicate assertions or relation rows", async () => {
      const database = createSupabaseDouble();
      writeRelationFile(
        tmpDir,
        "REL_TEST_COMMERCIAL_01.json",
        validRelationFile()
      );
      const records = loadAllRelationFiles(tmpDir);

      await loadRelations(database.client as never, records);
      const secondReport = await loadRelations(
        database.client as never,
        records
      );

      expect(secondReport.inserted).toBe(1);
      expect(database.sources).toHaveLength(1);
      expect(database.assertions).toHaveLength(1);
      expect(database.relations).toHaveLength(1);
      expect(database.confidenceCalls).toHaveLength(2);
    });

    // @req REQ-032
    it("logs, records, and continues past a relation the database rejects", async () => {
      const database = createSupabaseDouble({
        rejectRelationId: "REL_TEST_COMMERCIAL_02",
      });
      const relationA = validRelationFile({ id: "REL_TEST_COMMERCIAL_01" });
      const relationB = validRelationFile({
        id: "REL_TEST_COMMERCIAL_02",
        peopleIdA: "PPL_TEST_C",
        peopleIdB: "PPL_TEST_D",
      });
      writeRelationFile(tmpDir, "REL_TEST_COMMERCIAL_01.json", relationA);
      writeRelationFile(tmpDir, "REL_TEST_COMMERCIAL_02.json", relationB);
      const records = loadAllRelationFiles(tmpDir);

      const report = await loadRelations(database.client as never, records);

      expect(report.total).toBe(2);
      expect(report.inserted).toBe(1);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]).toContain("REL_TEST_COMMERCIAL_02");
      expect(database.relations).toHaveLength(1);
    });

    // @req REQ-032
    it("warns and still counts the relation inserted when confidence recompute fails", async () => {
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const database = createSupabaseDouble({
        rejectConfidenceId: "REL_TEST_COMMERCIAL_01",
      });
      writeRelationFile(
        tmpDir,
        "REL_TEST_COMMERCIAL_01.json",
        validRelationFile()
      );
      const records = loadAllRelationFiles(tmpDir);

      const report = await loadRelations(database.client as never, records);

      expect(report.inserted).toBe(1);
      expect(report.errors).toEqual([]);
      expect(database.relations).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});

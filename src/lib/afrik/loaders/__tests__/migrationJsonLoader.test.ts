import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/api/logger";
import { loadAllMigrationFiles, loadMigrations } from "../migrationJsonLoader";

// ─── fixtures ─────────────────────────────────────────────────────────────

function validMigrationFile(overrides: Record<string, unknown> = {}) {
  return {
    id: "MGR_TEST_EXPANSION_01",
    nameMain: "Expansion illustrative de test",
    migrationGroup: "test-group",
    eventType: "expansion",
    classificationStatus: "reconstructive",
    timeRange: {
      startYear: -1000,
      endYear: -500,
      datingNote: null,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [10, 5],
        [12, 3],
      ],
    },
    peoplesInvolved: [
      { id: "PPL_TEST_A", role: "origin" },
      { id: "PPL_TEST_B", role: "destination-formed" },
    ],
    content: {
      summary: "Résumé illustratif pour test.",
      narrative: "Récit illustratif pour test.",
      debate: null,
      sources: [
        {
          title: "Titre illustratif Tier 2",
          url: "https://example.org/source-tier-2-primary",
          year: 2019,
          tier: 2,
          notes: "Vérifié via Wikipedia FR + EN (illustratif).",
        },
        {
          title: "Titre illustratif Tier 1",
          url: "https://example.org/source-tier-1",
          year: 2020,
          tier: 1,
          notes: "",
        },
      ],
    },
    ...overrides,
  };
}

function writeMigrationFile(
  root: string,
  fileName: string,
  data: Record<string, unknown>
) {
  const dir = join(root, "migrations");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(data));
}

// ─── Supabase test double ──────────────────────────────────────────────────

interface SourceRow {
  id: string;
  title: string;
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
  fiche_revision_id?: string;
}

interface MigrationEventRow {
  id: string;
  slug: string;
  name: string;
  migration_group: string | null;
  event_type: string;
  classification_status: string;
  time_start_year: number;
  time_end_year: number;
  dating_note: string | null;
  geometry_geojson: unknown;
  summary: string;
  narrative: string;
  debate: string | null;
  [key: string]: unknown;
}

interface MigrationEventPeopleRow {
  migration_id: string;
  people_id: string;
  role: string | null;
}

interface FicheRevisionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  version: number;
  content_snapshot: unknown;
}

interface SupabaseDoubleOptions {
  rejectMigrationId?: string;
  rejectConfidenceId?: string;
}

function createSupabaseDouble(options: SupabaseDoubleOptions = {}) {
  const sources: SourceRow[] = [];
  const assertions: AssertionRow[] = [];
  const ficheRevisions: FicheRevisionRow[] = [];
  const events: MigrationEventRow[] = [];
  const eventPeoples: MigrationEventPeopleRow[] = [];
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

    if (table === "fiche_revisions") {
      return {
        upsert: vi.fn((row: Omit<FicheRevisionRow, "id">) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const existing = ficheRevisions.find(
                (r) =>
                  r.entity_type === row.entity_type &&
                  r.entity_id === row.entity_id &&
                  r.version === row.version
              );
              if (existing) {
                Object.assign(existing, row);
                return { data: { id: existing.id }, error: null };
              }
              const created = { id: nextId("rev"), ...row };
              ficheRevisions.push(created);
              return { data: { id: created.id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === "migration_events") {
      return {
        upsert: vi.fn(async (row: MigrationEventRow) => {
          if (
            options.rejectMigrationId &&
            row.id === options.rejectMigrationId
          ) {
            return {
              error: { message: `migration ${row.id} rejected (test double)` },
            };
          }

          const index = events.findIndex(
            (candidate) => candidate.id === row.id
          );
          if (index === -1) {
            events.push(row);
          } else {
            events[index] = row;
          }
          return { error: null };
        }),
      };
    }

    if (table === "migration_event_peoples") {
      return {
        delete: vi.fn(() => ({
          eq: vi.fn(async (_col: string, migrationId: string) => {
            for (let i = eventPeoples.length - 1; i >= 0; i -= 1) {
              if (eventPeoples[i].migration_id === migrationId) {
                eventPeoples.splice(i, 1);
              }
            }
            return { error: null };
          }),
        })),
        insert: vi.fn(async (rows: MigrationEventPeopleRow[]) => {
          eventPeoples.push(...rows);
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
    ficheRevisions,
    events,
    eventPeoples,
    confidenceCalls,
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("migrationJsonLoader", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_migrations_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("loadAllMigrationFiles", () => {
    // @req REQ-080
    it("loads a valid migration file from a real fixture", () => {
      writeMigrationFile(
        tmpDir,
        "MGR_TEST_EXPANSION_01.json",
        validMigrationFile()
      );

      const migrations = loadAllMigrationFiles(tmpDir);

      expect(migrations).toHaveLength(1);
      expect(migrations[0].id).toBe("MGR_TEST_EXPANSION_01");
      expect(migrations[0].eventType).toBe("expansion");
      expect(migrations[0].peoplesInvolved).toHaveLength(2);
    });

    // @req REQ-080
    it("skips a file failing the strict model (Story 12.1 / FR80) and logs the error", () => {
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      writeMigrationFile(
        tmpDir,
        "MGR_INVALID.json",
        validMigrationFile({
          content: { ...validMigrationFile().content, sources: [] },
        }) // invalid: at least one source required
      );

      const migrations = loadAllMigrationFiles(tmpDir);

      expect(migrations).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    // @req REQ-080
    it("skips a contested fiche missing debate/datingNote and logs the error", () => {
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      writeMigrationFile(
        tmpDir,
        "MGR_CONTESTED_INVALID.json",
        validMigrationFile({ classificationStatus: "contested" })
      );

      const migrations = loadAllMigrationFiles(tmpDir);

      expect(migrations).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    // @req REQ-080
    it("returns an empty array when the migrations directory is absent", () => {
      expect(loadAllMigrationFiles(join(tmpDir, "missing"))).toEqual([]);
    });
  });

  describe("loadMigrations", () => {
    // @req REQ-080
    it("upserts sources, one assertion, the event row, peoples, and seeds confidence_scores", async () => {
      const database = createSupabaseDouble();
      writeMigrationFile(
        tmpDir,
        "MGR_TEST_EXPANSION_01.json",
        validMigrationFile()
      );
      const records = loadAllMigrationFiles(tmpDir);

      const report = await loadMigrations(database.client as never, records);

      expect(report.total).toBe(1);
      expect(report.inserted).toBe(1);
      expect(report.errors).toEqual([]);

      expect(database.sources).toHaveLength(2);
      expect(database.assertions).toHaveLength(1);
      expect(database.assertions[0]).toMatchObject({
        entity_type: "migration",
        entity_id: "MGR_TEST_EXPANSION_01",
        field_path: "record",
      });
      expect(database.assertions[0].source_ids).toHaveLength(2);

      // assertions.fiche_revision_id is NOT NULL since migration 020, and no
      // loader ever created the revision it points at — every insert failed
      // against a real database while the mock let it through (ETNI-1199).
      expect(database.ficheRevisions).toHaveLength(1);
      expect(database.ficheRevisions[0]).toMatchObject({
        entity_type: "migration",
        entity_id: "MGR_TEST_EXPANSION_01",
        version: 1,
      });
      expect(database.assertions[0].fiche_revision_id).toBe(
        database.ficheRevisions[0].id
      );

      expect(database.events).toHaveLength(1);
      expect(database.events[0]).toMatchObject({
        id: "MGR_TEST_EXPANSION_01",
        slug: "test-expansion-01",
        name: "Expansion illustrative de test",
        migration_group: "test-group",
        event_type: "expansion",
        classification_status: "reconstructive",
        time_start_year: -1000,
        time_end_year: -500,
      });

      expect(database.eventPeoples).toHaveLength(2);
      expect(database.eventPeoples).toEqual(
        expect.arrayContaining([
          {
            migration_id: "MGR_TEST_EXPANSION_01",
            people_id: "PPL_TEST_A",
            role: "origin",
          },
          {
            migration_id: "MGR_TEST_EXPANSION_01",
            people_id: "PPL_TEST_B",
            role: "destination-formed",
          },
        ])
      );

      expect(database.confidenceCalls).toEqual([
        { p_entity_type: "migration", p_entity_id: "MGR_TEST_EXPANSION_01" },
      ]);
    });

    // @req REQ-080
    it("dedups a source cited by more than one migration via the title constraint", async () => {
      const database = createSupabaseDouble();
      const sharedSource = {
        title: "Shared Tier 1 Source",
        year: 2024,
        url: "https://example.org/shared",
        tier: 1,
        notes: "",
      };
      const migrationA = validMigrationFile({
        id: "MGR_TEST_EXPANSION_01",
        content: {
          ...validMigrationFile().content,
          sources: [sharedSource],
        },
      });
      const migrationB = validMigrationFile({
        id: "MGR_TEST_EXPANSION_02",
        peoplesInvolved: [{ id: "PPL_TEST_C", role: "origin" }],
        content: {
          ...validMigrationFile().content,
          sources: [sharedSource],
        },
      });
      writeMigrationFile(tmpDir, "MGR_TEST_EXPANSION_01.json", migrationA);
      writeMigrationFile(tmpDir, "MGR_TEST_EXPANSION_02.json", migrationB);
      const records = loadAllMigrationFiles(tmpDir);

      const report = await loadMigrations(database.client as never, records);

      expect(report.inserted).toBe(2);
      expect(database.sources).toHaveLength(1);
      expect(database.events).toHaveLength(2);
    });

    // @req REQ-080
    it("is idempotent on re-run: no duplicate assertions, events, or people rows", async () => {
      const database = createSupabaseDouble();
      writeMigrationFile(
        tmpDir,
        "MGR_TEST_EXPANSION_01.json",
        validMigrationFile()
      );
      const records = loadAllMigrationFiles(tmpDir);

      await loadMigrations(database.client as never, records);
      const secondReport = await loadMigrations(
        database.client as never,
        records
      );

      expect(secondReport.inserted).toBe(1);
      expect(database.sources).toHaveLength(2);
      expect(database.assertions).toHaveLength(1);
      expect(database.events).toHaveLength(1);
      expect(database.eventPeoples).toHaveLength(2);
      expect(database.confidenceCalls).toHaveLength(2);
    });

    // @req REQ-080
    it("replaces stale peoples rows when a fiche removes a people on re-run", async () => {
      const database = createSupabaseDouble();
      writeMigrationFile(
        tmpDir,
        "MGR_TEST_EXPANSION_01.json",
        validMigrationFile()
      );
      const firstRun = loadAllMigrationFiles(tmpDir);
      await loadMigrations(database.client as never, firstRun);
      expect(database.eventPeoples).toHaveLength(2);

      writeMigrationFile(
        tmpDir,
        "MGR_TEST_EXPANSION_01.json",
        validMigrationFile({
          peoplesInvolved: [{ id: "PPL_TEST_A", role: "origin" }],
        })
      );
      const secondRun = loadAllMigrationFiles(tmpDir);
      await loadMigrations(database.client as never, secondRun);

      expect(database.eventPeoples).toHaveLength(1);
      expect(database.eventPeoples[0]).toMatchObject({
        people_id: "PPL_TEST_A",
      });
    });

    // @req REQ-080
    it("logs, records, and continues past a migration the database rejects", async () => {
      const database = createSupabaseDouble({
        rejectMigrationId: "MGR_TEST_EXPANSION_02",
      });
      const migrationA = validMigrationFile({ id: "MGR_TEST_EXPANSION_01" });
      const migrationB = validMigrationFile({
        id: "MGR_TEST_EXPANSION_02",
        peoplesInvolved: [{ id: "PPL_TEST_C", role: "origin" }],
      });
      writeMigrationFile(tmpDir, "MGR_TEST_EXPANSION_01.json", migrationA);
      writeMigrationFile(tmpDir, "MGR_TEST_EXPANSION_02.json", migrationB);
      const records = loadAllMigrationFiles(tmpDir);

      const report = await loadMigrations(database.client as never, records);

      expect(report.total).toBe(2);
      expect(report.inserted).toBe(1);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]).toContain("MGR_TEST_EXPANSION_02");
      expect(database.events).toHaveLength(1);
    });

    // @req REQ-080
    it("warns and still counts the migration inserted when confidence recompute fails", async () => {
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const database = createSupabaseDouble({
        rejectConfidenceId: "MGR_TEST_EXPANSION_01",
      });
      writeMigrationFile(
        tmpDir,
        "MGR_TEST_EXPANSION_01.json",
        validMigrationFile()
      );
      const records = loadAllMigrationFiles(tmpDir);

      const report = await loadMigrations(database.client as never, records);

      expect(report.inserted).toBe(1);
      expect(report.errors).toEqual([]);
      expect(database.events).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});

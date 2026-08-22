import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { MIGRATION_EVENT_TYPES } from "../migrationEventTypes";

/**
 * Story 13.1 (ETNI-525) — lockstep test: the four colonization event types
 * (fragmentation, displacement, imposed_name, resistance) must be present,
 * identical, across the TS union, the SQL migration's ADD VALUE labels, and
 * modele-migration.json's eventType enum. Test-first: this fails until all
 * three sources are extended together.
 */

const COLONIAL_EVENT_TYPES = [
  "fragmentation",
  "displacement",
  "imposed_name",
  "resistance",
] as const;

const MIGRATIONS_DIR = path.join(__dirname, "../../../../supabase/migrations");
const MODEL_PATH = path.join(
  __dirname,
  "../../../../public/modele-migration.json"
);

function readSqlEnumLabels(): string[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith("colonization_event_types.sql"));
  expect(files.length).toBe(1);
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, files[0]), "utf-8");
  const matches = [
    ...sql.matchAll(
      /ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS '([a-z_]+)'/g
    ),
  ];
  return matches.map((m) => m[1]);
}

describe("colonization event types lockstep (ETNI-525)", () => {
  // @req REQ-080
  it("are all present in the TS union", () => {
    for (const value of COLONIAL_EVENT_TYPES) {
      expect(MIGRATION_EVENT_TYPES).toContain(value);
    }
  });

  // @req REQ-080
  it("are all added by the SQL migration's ADD VALUE statements", () => {
    const sqlLabels = readSqlEnumLabels();
    for (const value of COLONIAL_EVENT_TYPES) {
      expect(sqlLabels).toContain(value);
    }
  });

  // @req REQ-080
  it("are all present in modele-migration.json's eventType enum", () => {
    const model = JSON.parse(fs.readFileSync(MODEL_PATH, "utf-8")) as {
      _meta?: { eventTypeEnum?: string[] };
    };
    const modelEnum = model._meta?.eventTypeEnum ?? [];
    for (const value of COLONIAL_EVENT_TYPES) {
      expect(modelEnum).toContain(value);
    }
  });

  // @req REQ-080
  it("keeps the TS union, SQL migration and model enum in exact lockstep", () => {
    const sqlLabels = readSqlEnumLabels();
    const model = JSON.parse(fs.readFileSync(MODEL_PATH, "utf-8")) as {
      _meta?: { eventTypeEnum?: string[] };
    };
    const modelEnum = [...(model._meta?.eventTypeEnum ?? [])].sort();
    const tsUnion = [...MIGRATION_EVENT_TYPES].sort();
    const sqlAdded = [...sqlLabels].sort();

    expect(tsUnion).toEqual(modelEnum);
    expect(sqlAdded).toEqual([...COLONIAL_EVENT_TYPES].sort());
  });
});

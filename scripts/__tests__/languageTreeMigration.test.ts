/**
 * Static analysis of migration 028_language_tree_support.sql.
 *
 * These tests parse the SQL text to verify the DDL contract without a live
 * Postgres instance in CI (same discipline as
 * supabase/__tests__/moderator-schema.test.ts): we verify structure and
 * idempotence markers, not runtime database behaviour.
 *
 * Coverage (ETNI-453 acceptance criteria):
 *   - creates idx_afrik_peoples_family_name on
 *     afrik_peoples(language_family_id, name_main) with IF NOT EXISTS
 *   - does not re-declare idx_afrik_languages_family_id or
 *     idx_afrik_peoples_family_id (already created by 006)
 *   - uses IF NOT EXISTS everywhere, so re-applying the migration is a no-op
 */
import { readFileSync } from "fs";
import path from "path";

import { describe, expect, it, beforeAll } from "vitest";

let sql: string;

beforeAll(() => {
  sql = readFileSync(
    path.resolve(
      __dirname,
      "../../supabase/migrations/028_language_tree_support.sql"
    ),
    "utf-8"
  );
});

describe("idx_afrik_peoples_family_name", () => {
  // @req REQ-062
  it("creates the composite index with IF NOT EXISTS", () => {
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS\s+idx_afrik_peoples_family_name/i
    );
  });

  // @req REQ-062
  it("indexes afrik_peoples on (language_family_id, name_main) in that order", () => {
    expect(sql).toMatch(
      /idx_afrik_peoples_family_name[\s\S]{0,80}ON\s+afrik_peoples\s*\(\s*language_family_id\s*,\s*name_main\s*\)/i
    );
  });
});

describe("no duplicate 006 indexes", () => {
  // @req REQ-062
  it("does not re-declare idx_afrik_languages_family_id", () => {
    expect(sql).not.toMatch(/idx_afrik_languages_family_id/i);
  });

  // @req REQ-062
  it("does not re-declare idx_afrik_peoples_family_id", () => {
    expect(sql).not.toMatch(/idx_afrik_peoples_family_id\b/i);
  });
});

describe("idempotence", () => {
  // @req REQ-062
  it("every CREATE INDEX statement uses IF NOT EXISTS", () => {
    const createIndexStatements = sql.match(/CREATE INDEX[^\n;]*/gi) ?? [];

    expect(createIndexStatements.length).toBeGreaterThan(0);

    for (const statement of createIndexStatements) {
      expect(statement, statement).toMatch(/IF NOT EXISTS/i);
    }
  });

  // @req REQ-062
  it("creates exactly one index", () => {
    const createIndexStatements = sql.match(/CREATE INDEX/gi) ?? [];

    expect(createIndexStatements).toHaveLength(1);
  });
});

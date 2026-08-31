/**
 * Static analysis of migration 054_afrik_people_languages.sql — the
 * people-to-language join table (ARCH-020, REQ-136).
 *
 * Same discipline as scripts/__tests__/nameTableMigration.test.ts: parse the
 * SQL text to verify the DDL contract without a live Postgres instance in
 * CI. No migration is ever applied from this repository's automation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/054_afrik_people_languages.sql"),
  "utf8"
);

describe("054_afrik_people_languages.sql migration contract", () => {
  // @req REQ-136
  it("declares afrik_people_languages with foreign keys that cascade on delete", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS afrik_people_languages"
    );
    expect(migration).toContain(
      "people_id VARCHAR(50) NOT NULL REFERENCES afrik_peoples(id) ON DELETE CASCADE"
    );
    expect(migration).toContain(
      "language_id VARCHAR(10) NOT NULL REFERENCES afrik_languages(id) ON DELETE CASCADE"
    );
  });

  // @req REQ-136
  it("rejects inserting the same people/language relation twice (AC2)", () => {
    expect(migration).toContain("PRIMARY KEY (people_id, language_id)");
    // No unique constraint on either column alone — a people can declare
    // several languages and a language can have several peoples.
    expect(migration).not.toMatch(/UNIQUE\s*\(\s*people_id\s*\)/);
    expect(migration).not.toMatch(/UNIQUE\s*\(\s*language_id\s*\)/);
  });

  // @req REQ-136
  it("indexes language_id so a language's speakers are found without reading content JSONB (AC1)", () => {
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_afrik_people_languages_language_id ON afrik_people_languages(language_id)"
    );
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_afrik_people_languages_people_id ON afrik_people_languages(people_id)"
    );
  });

  // @req REQ-136
  it("enables RLS with a public-read-only policy, matching afrik_people_countries", () => {
    expect(migration).toContain(
      "ALTER TABLE afrik_people_languages ENABLE ROW LEVEL SECURITY"
    );
    expect(migration).toContain(
      "DROP POLICY IF EXISTS afrik_people_languages_read_public"
    );
    expect(migration).toContain(
      "CREATE POLICY afrik_people_languages_read_public ON afrik_people_languages"
    );
    expect(migration).toContain("FOR SELECT USING (true)");
    // Public SELECT only — no INSERT/UPDATE/DELETE policy, writes flow
    // through the service-role loader only (same posture as 019/053).
    expect(migration).not.toContain("FOR INSERT");
    expect(migration).not.toContain("FOR ALL");
  });

  // @req REQ-136
  it("does not populate the table — loading the corpus is a separate ticket", () => {
    expect(migration).not.toMatch(/INSERT INTO afrik_people_languages/i);
  });

  // @req REQ-136
  it("is fully idempotent — IF NOT EXISTS and DROP-then-CREATE throughout", () => {
    const createTableMatches = migration.match(
      /CREATE TABLE (?!IF NOT EXISTS)\S+/g
    );
    expect(createTableMatches).toBeNull();
    const createIndexMatches = migration.match(
      /CREATE INDEX (?!IF NOT EXISTS)\S+/g
    );
    expect(createIndexMatches).toBeNull();
  });
});

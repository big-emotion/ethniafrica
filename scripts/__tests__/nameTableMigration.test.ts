/**
 * Static analysis of migration 053_name_table.sql — the first-class "name"
 * entity (internally afrik_patronymes, per DEC-038) and its nameSystem
 * discriminant (DEC-039, ARCH-019).
 *
 * Same discipline as scripts/__tests__/namesAtlasMigration.test.ts and
 * scripts/__tests__/languageTreeMigration.test.ts: parse the SQL text to
 * verify the DDL contract without a live Postgres instance in CI. No
 * migration is ever applied from this repository's automation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/053_name_table.sql"),
  "utf8"
);

describe("053_name_table.sql migration contract", () => {
  // @req REQ-133
  it("declares the name_system_type enum with the five DEC-039 subtypes, idempotently", () => {
    expect(migration).toContain("CREATE TYPE name_system_type AS ENUM");
    expect(migration).toContain("'clan_name'");
    expect(migration).toContain("'non_hereditary_patronymic'");
    expect(migration).toContain("'nisba'");
    expect(migration).toContain("'praise_name'");
    expect(migration).toContain("'totemic_clan'");
    expect(migration).toContain("EXCEPTION WHEN duplicate_object THEN NULL");
  });

  // @req REQ-133
  it("declares the afrik_patronymes table with a mandatory nameSystem discriminant (AC1)", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS afrik_patronymes");
    expect(migration).toContain(
      "id TEXT PRIMARY KEY CHECK (id ~ '^PAT_[A-Z0-9_]+$')"
    );
    expect(migration).toContain("name_system name_system_type NOT NULL");
    expect(migration).toContain("content JSONB NOT NULL DEFAULT '{}'");
    expect(migration).toContain("created_at");
    expect(migration).toContain("updated_at");
  });

  // @req REQ-133
  it("carries caste_or_social_function as its own column, distinct from any biographical role (AC2, DEC-039)", () => {
    expect(migration).toContain("caste_or_social_function TEXT");
    // The ARCH-018 person entity (role_category) does not exist yet — this
    // migration must not reference it or any view collapsing the two axes.
    expect(migration).not.toContain("role_category");
    expect(migration).not.toContain("CREATE VIEW");
  });

  // @req REQ-133
  it("joins to peoples and countries as n-to-n, never marking an exclusive people (AC3)", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS afrik_patronyme_peoples"
    );
    expect(migration).toContain(
      "patronyme_id TEXT NOT NULL REFERENCES afrik_patronymes(id) ON DELETE CASCADE"
    );
    expect(migration).toContain(
      "people_id VARCHAR(50) NOT NULL REFERENCES afrik_peoples(id) ON DELETE CASCADE"
    );
    expect(migration).toContain("PRIMARY KEY (patronyme_id, people_id)");

    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS afrik_patronyme_countries"
    );
    expect(migration).toContain(
      "country_id CHAR(3) NOT NULL REFERENCES afrik_countries(id) ON DELETE CASCADE"
    );
    expect(migration).toContain("PRIMARY KEY (patronyme_id, country_id)");

    // Composite PKs only — no unique constraint on patronyme_id alone that
    // would force a name to a single people or country.
    expect(migration).not.toMatch(/UNIQUE\s*\(\s*patronyme_id\s*\)/);
  });

  // @req REQ-133
  it("indexes both directions of each join table", () => {
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_peoples_patronyme_id ON afrik_patronyme_peoples(patronyme_id)"
    );
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_peoples_people_id ON afrik_patronyme_peoples(people_id)"
    );
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_countries_patronyme_id ON afrik_patronyme_countries(patronyme_id)"
    );
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_countries_country_id ON afrik_patronyme_countries(country_id)"
    );
  });

  // @req REQ-133
  it("enables RLS on all three tables with a public-read-only policy, matching afrik_people_countries", () => {
    expect(migration).toContain(
      "ALTER TABLE afrik_patronymes ENABLE ROW LEVEL SECURITY"
    );
    expect(migration).toContain(
      "ALTER TABLE afrik_patronyme_peoples ENABLE ROW LEVEL SECURITY"
    );
    expect(migration).toContain(
      "ALTER TABLE afrik_patronyme_countries ENABLE ROW LEVEL SECURITY"
    );
    expect(migration).toContain(
      "DROP POLICY IF EXISTS afrik_patronymes_read_public"
    );
    expect(migration).toContain(
      "CREATE POLICY afrik_patronymes_read_public ON afrik_patronymes"
    );
    expect(migration).toContain(
      "DROP POLICY IF EXISTS afrik_patronyme_peoples_read_public"
    );
    expect(migration).toContain(
      "DROP POLICY IF EXISTS afrik_patronyme_countries_read_public"
    );
    // Public SELECT only — no INSERT/UPDATE/DELETE policy, writes flow
    // through the service-role loader only (same posture as 030/019).
    expect(migration).not.toContain("FOR INSERT");
    expect(migration).not.toContain("FOR ALL");
  });

  // @req REQ-133
  it("explicitly documents the deferred name-to-persons join, without creating it", () => {
    expect(migration).toMatch(/persons.*deferred|deferred.*persons/i);
    expect(migration).not.toContain(
      "CREATE TABLE IF NOT EXISTS afrik_patronyme_persons"
    );
  });

  // @req REQ-133
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

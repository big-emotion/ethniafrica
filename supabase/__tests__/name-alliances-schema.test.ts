/**
 * Static contract for the ETNI-1455 name-granularity alliances migration.
 *
 * Unit tests do not connect to a live Supabase instance (see
 * source-working-assets-schema.test.ts and afrik-language-search-schema.test.ts
 * for the same convention), so these assertions keep the canonical-ordering
 * constraint (AC1) and the source-or-drop trigger (AC2) visible in the
 * migration a human will apply.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/061_name_alliances.sql"
);

function migrationSql(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("name-granularity alliances migration", () => {
  // @req REQ-093
  it("rejects a reversed pair via the canonical ordering constraint (AC1)", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /name_id_a\s+TEXT NOT NULL REFERENCES afrik_patronymes\(id\)/i
    );
    expect(sql).toMatch(
      /name_id_b\s+TEXT NOT NULL REFERENCES afrik_patronymes\(id\)/i
    );
    expect(sql).toMatch(/CHECK \(name_id_a < name_id_b\)/i);
    expect(sql).toMatch(/CHECK \(name_id_a <> name_id_b\)/i);
    expect(sql).toMatch(/UNIQUE \(name_id_a, name_id_b\)/i);
  });

  // @req REQ-093
  it("rejects a sourceless edge via the source-or-drop trigger (AC2)", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/source_id\s+UUID NOT NULL REFERENCES sources\(id\)/i);
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION enforce_alliance_source\(\)/i
    );
    expect(sql).toMatch(/NEW\.source_id IS NULL/i);
    expect(sql).toMatch(/RAISE EXCEPTION[\s\S]*source or drop/i);
    expect(sql).toMatch(
      /CREATE TRIGGER afrik_patronyme_alliances_source_or_drop[\s\S]*BEFORE INSERT OR UPDATE ON afrik_patronyme_alliances[\s\S]*EXECUTE FUNCTION enforce_alliance_source\(\)/i
    );
  });

  // @req REQ-093
  it("restricts tier to the one three-value vocabulary (migration 041)", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /tier\s+TEXT NOT NULL CHECK \(tier IN \('official', 'referenced', 'unverified'\)\)/i
    );
  });

  // @req REQ-093
  it("enables RLS with public read only, no anon/authenticated write policy", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /ALTER TABLE afrik_patronyme_alliances ENABLE ROW LEVEL SECURITY/i
    );
    expect(sql).toMatch(
      /CREATE POLICY afrik_patronyme_alliances_read_public ON afrik_patronyme_alliances\s*\n\s*FOR SELECT USING \(true\)/i
    );
    expect(sql).not.toMatch(
      /CREATE POLICY[\s\S]{0,200}afrik_patronyme_alliances[\s\S]{0,200}FOR (INSERT|UPDATE|DELETE)/i
    );
  });
});

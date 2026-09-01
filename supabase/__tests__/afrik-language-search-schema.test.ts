/**
 * Static contract for the ETNI-1504 language search-vector migration.
 *
 * Unit tests do not connect to a live Supabase instance, so these assertions
 * keep the identifier, provenance, alternate-name, and index weights visible
 * in the migration that a human will apply.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/055_afrik_language_search_vector.sql"
);

function migrationSql(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("AFRIK language search-vector migration", () => {
  // @req REQ-136
  it("creates a stored generated search vector and its GIN index", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /ALTER TABLE public\.afrik_languages DROP COLUMN IF EXISTS search_vector/i
    );
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS search_vector tsvector[\s\S]*GENERATED ALWAYS AS[\s\S]*STORED/i
    );
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_afrik_languages_search_vector[\s\S]*USING gin\(search_vector\)/i
    );
  });

  // @req REQ-136
  it("indexes the ISO code and sourced canonical name at the highest weight", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /setweight\(to_tsvector\('simple', COALESCE\(id, ''\)\), 'A'\)/i
    );
    expect(sql).toMatch(
      /ELSE setweight\(to_tsvector\('french', COALESCE\(name, ''\)\), 'A'\)[\s\S]*END/i
    );
  });

  // @req REQ-136
  it("keeps derived canonical names below sourced names and alternate names below canonical ones", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /CASE[\s\S]*COALESCE\(content ->> 'nameProvenance', 'sourced'\) = 'derived'[\s\S]*THEN setweight\(to_tsvector\('french', COALESCE\(name, ''\)\), 'C'\)[\s\S]*ELSE setweight\(to_tsvector\('french', COALESCE\(name, ''\)\), 'A'\)[\s\S]*END/i
    );
    expect(sql).toMatch(
      /jsonb_to_tsvector\([\s\S]*COALESCE\(content -> 'alternateNames', '\[\]'::jsonb\)[\s\S]*'\[\"string\"\]'::jsonb[\s\S]*'B'\)/i
    );
  });
});

/**
 * Static contract for the ETNI-667 controlled working-copy boundary.
 *
 * The database schema is the security boundary for copyrighted scans and OCR
 * output. These assertions intentionally inspect the migration because this
 * repository does not require a live Supabase instance in unit-test runs.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/034_source_working_assets.sql"
);

function migrationSql(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("source working assets schema migration", () => {
  // @req REQ-093
  it("keeps protected working copies separate from bibliographic sources", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS source_working_assets/i);
    expect(sql).toMatch(/source_id UUID NOT NULL REFERENCES sources\(id\)/i);
    expect(sql).toMatch(/owner_id UUID NOT NULL REFERENCES auth\.users\(id\)/i);
    expect(sql).toMatch(/asset_kind TEXT NOT NULL/i);
    expect(sql).toMatch(/asset_kind IN \('scan', 'ocr'\)/i);
    expect(sql).not.toMatch(/ALTER TABLE sources[\s\S]*asset_/i);
  });

  // @req REQ-093
  it("makes the asset record permanently private and binds it to the private bucket", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/rights_status TEXT NOT NULL DEFAULT 'private'/i);
    expect(sql).toMatch(/rights_status = 'private'/i);
    expect(sql).toMatch(
      /bucket_id TEXT NOT NULL DEFAULT 'source-working-assets'/i
    );
    expect(sql).toMatch(/bucket_id = 'source-working-assets'/i);
    expect(sql).toMatch(/object_path TEXT NOT NULL/i);
    expect(sql).toMatch(/UNIQUE \(bucket_id, object_path\)/i);
  });

  // @req REQ-093
  it("enables metadata RLS with owner access and editorial oversight only", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /ALTER TABLE source_working_assets ENABLE ROW LEVEL SECURITY/i
    );
    expect(sql).toMatch(/source_working_assets_owner_insert/i);
    expect(sql).toMatch(/owner_id = auth\.uid\(\)/i);
    expect(sql).toMatch(
      /split_part\(object_path, '\/', 1\) = auth\.uid\(\)::TEXT/i
    );
    expect(sql).toMatch(/contributor_profiles cp/i);
    expect(sql).toMatch(
      /cp\.moderator_role IN \('editor', 'senior_editor', 'admin'\)/i
    );
    expect(sql).not.toMatch(
      /source_working_assets[\s\S]{0,300}FOR SELECT USING \(true\)/i
    );
  });

  // @req REQ-093
  it("creates a non-public storage bucket and scopes object policies to it", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /INSERT INTO storage\.buckets[\s\S]*'source-working-assets'[\s\S]*false/i
    );
    expect(sql).toMatch(/ON CONFLICT \(id\) DO UPDATE SET public = false/i);
    expect(sql).toMatch(
      /CREATE POLICY source_working_assets_objects_owner_select/i
    );
    expect(sql).toMatch(/bucket_id = 'source-working-assets'/i);
    expect(sql).toMatch(
      /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/i
    );
    expect(sql).not.toMatch(/storage\.objects[\s\S]{0,500}USING \(true\)/i);
  });
});

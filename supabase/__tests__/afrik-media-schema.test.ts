import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/073_afrik_media.sql"
);

function migrationSql(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("AFRIK media schema migration", () => {
  // @req REQ-128
  it("rejects a missing or blank licence URI at persistence", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/licence_uri TEXT NOT NULL/i);
    expect(sql).toMatch(/CHECK \(btrim\(licence_uri\) <> ''\)/i);
  });

  // @req REQ-128
  it("records authorship, provenance, period and depiction timing", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/author TEXT/i);
    expect(sql).toMatch(/source_page_url TEXT/i);
    expect(sql).toMatch(/period TEXT/i);
    expect(sql).toMatch(
      /depiction_timing TEXT NOT NULL CHECK \(depiction_timing IN \('contemporary', 'reconstitution'\)\)/i
    );
  });

  // @req REQ-128
  it("indexes fiche attachments and allows public reads without public writes", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/ON afrik_media\(entity_type, entity_id\)/i);
    expect(sql).toMatch(/ALTER TABLE afrik_media ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(
      /CREATE POLICY\s+afrik_media_read_public ON afrik_media\s+FOR SELECT USING \(true\)/i
    );
    expect(sql).not.toMatch(
      /CREATE POLICY[\s\S]{0,200}afrik_media[\s\S]{0,200}FOR (INSERT|UPDATE|DELETE)/i
    );
  });
});

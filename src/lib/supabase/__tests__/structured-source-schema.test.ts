import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/031_normalized_sources.sql"
);

describe("normalized source schema migration", () => {
  // @req REQ-093
  it("creates stable source keys and preserves offline citations without URLs", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS source_key TEXT/);
    expect(migration).toMatch(/sources_source_key_key/);
    expect(migration).not.toMatch(/ALTER COLUMN url SET NOT NULL/);
  });

  // @req REQ-093
  it("stores assertion-reference locators separately from source records", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(
      /CREATE TABLE IF NOT EXISTS assertion_references/
    );
    expect(migration).toMatch(/locator_type TEXT NOT NULL/);
    expect(migration).toMatch(/locator_value TEXT NOT NULL/);
    expect(migration).toMatch(/legacy_raw_citation TEXT/);
    expect(migration).toMatch(/review_status TEXT NOT NULL DEFAULT 'verified'/);
  });

  // @req REQ-093
  it("is idempotent and keeps legacy data available for the compatibility boundary", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS/);
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS/);
    expect(migration).toMatch(/DO \$\$/);
    expect(migration).toMatch(/source_ids/);
  });
});

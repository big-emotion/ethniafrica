import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/032_oral_narratives.sql"
);

describe("oral narrative persistence model", () => {
  // @req REQ-095
  it("keeps narratives separate, attributed, and publication-gated", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS oral_narratives/i);
    expect(migration).toMatch(/assertion_id UUID REFERENCES assertions\(id\)/i);
    expect(migration).toMatch(
      /variant_of UUID REFERENCES oral_narratives\(id\)/i
    );
    expect(migration).toMatch(
      /CREATE TABLE IF NOT EXISTS oral_narrative_links/i
    );
    expect(migration).toMatch(/'language_family', 'people', 'country'/i);
    expect(migration).toMatch(
      /visibility = 'public'[\s\S]*review_status = 'approved'[\s\S]*rights_status = 'cleared'/i
    );
  });

  // @req REQ-095
  it("allows anonymous reads only for publishable narratives", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/oral_narratives_public_read/i);
    expect(migration).toMatch(
      /FOR SELECT USING \([\s\S]*visibility = 'public'[\s\S]*review_status = 'approved'[\s\S]*rights_status = 'cleared'/i
    );
    expect(migration).not.toMatch(
      /FOR (?:ALL|INSERT|UPDATE|DELETE) USING \(true\)/i
    );
  });
});

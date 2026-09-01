import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/066_patronyme_name_record_source_tiers.sql"
  ),
  "utf8"
);

describe("066 patronyme name-record source-tier contract", () => {
  // @req REQ-133
  it("accepts all three explicit tiers only for patronyme name records", () => {
    expect(migration).toContain("NEW.entity_type = 'patronyme'");
    expect(migration).toContain(
      "s.tier IN ('official', 'referenced', 'unverified')"
    );
  });

  // @req REQ-133
  it("preserves the official-or-referenced gate for people name records", () => {
    expect(migration).toContain("NEW.entity_type <> 'patronyme'");
    expect(migration).toContain("s.tier IN ('official', 'referenced')");
  });

  // @req REQ-133
  it("replaces the trigger function idempotently without applying data changes", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION enforce_name_record_sources()"
    );
    expect(migration).not.toMatch(/\bINSERT\s+INTO\s+name_records\b/i);
    expect(migration).not.toMatch(/\bUPDATE\s+name_records\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\s+name_records\b/i);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/029_names_atlas.sql"),
  "utf8"
);

describe("029_names_atlas.sql migration contract", () => {
  // @req REQ-007
  it("declares the name_record_type enum idempotently", () => {
    expect(migration).toContain(
      "CREATE TYPE name_record_type AS ENUM ('endonym', 'exonym', 'historical_spelling', 'surname')"
    );
    expect(migration).toContain("EXCEPTION WHEN duplicate_object THEN NULL");
  });

  // @req REQ-007
  it("declares the name_records table with the required columns", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS name_records");
    expect(migration).toContain(
      "id uuid PRIMARY KEY DEFAULT gen_random_uuid()"
    );
    expect(migration).toContain("entity_type TEXT NOT NULL DEFAULT 'people'");
    expect(migration).toContain("entity_id VARCHAR(50) NOT NULL");
    expect(migration).toContain("name_text TEXT NOT NULL");
    expect(migration).toContain("name_type name_record_type NOT NULL");
    expect(migration).toContain("language_of_origin VARCHAR(3)");
    expect(migration).toContain("meaning TEXT");
    expect(migration).toContain("period_label TEXT");
    expect(migration).toContain("imposed_by TEXT");
    expect(migration).toContain("imposition_period TEXT");
    expect(migration).toContain("why_problematic TEXT");
    expect(migration).toContain("contemporary_usage TEXT");
    expect(migration).toContain(
      "assertion_id uuid NOT NULL REFERENCES assertions(id)"
    );
    expect(migration).toContain("sort_rank INTEGER NOT NULL DEFAULT 0");
    expect(migration).toContain(
      "created_at timestamptz NOT NULL DEFAULT now()"
    );
    expect(migration).toContain(
      "updated_at timestamptz NOT NULL DEFAULT now()"
    );
  });

  // @req REQ-007
  it("declares the two table-level constraints", () => {
    expect(migration).toContain(
      "CONSTRAINT name_records_imposed_needs_context CHECK (imposed_by IS NULL OR why_problematic IS NOT NULL)"
    );
    expect(migration).toContain(
      "CONSTRAINT name_records_unique_variant UNIQUE (entity_type, entity_id, name_text, name_type)"
    );
  });

  // @req REQ-007
  it("declares a source-or-drop trigger rejecting sourceless assertions", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION enforce_name_record_sources()"
    );
    expect(migration).toContain("NEW.assertion_id IS NULL");
    expect(migration).toContain("RAISE EXCEPTION");
    // Which tiers qualify is pinned by the source-tier vocabulary contract
    // (src/lib/sources/__tests__/sourceTierVocabulary.test.ts), which also
    // asserts that migration 041 recreates this function with the new values.
    expect(migration).toContain("AND s.tier IN (");
    expect(migration).toContain("DROP TRIGGER IF EXISTS");
    expect(migration).toContain("CREATE TRIGGER name_records_source_or_drop");
    expect(migration).toContain("BEFORE INSERT OR UPDATE ON name_records");
  });

  // @req REQ-007
  it("declares the generated search_vector column + GIN index", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS search_vector tsvector"
    );
    expect(migration).toContain("GENERATED ALWAYS AS");
    expect(migration).toContain("to_tsvector('french'");
    expect(migration).toContain("STORED");
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_name_records_search_vector"
    );
    expect(migration).toContain("USING gin(search_vector)");
  });

  // @req REQ-007
  it("declares the entity lookup index", () => {
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_name_records_entity"
    );
    expect(migration).toContain("ON name_records(entity_type, entity_id)");
  });

  // @req REQ-007
  it("enables RLS with a public-read policy and a moderator/admin write policy", () => {
    expect(migration).toContain(
      "ALTER TABLE name_records ENABLE ROW LEVEL SECURITY"
    );
    expect(migration).toContain("FOR SELECT USING (true)");
    expect(migration).toContain("user_roles.role IN ('moderator', 'admin')");
    expect(migration).toContain("DROP POLICY IF EXISTS");
  });
});

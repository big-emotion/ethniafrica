import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/033_rights_consent_access_controls.sql"
);

describe("rights, consent, and access controls migration", () => {
  // @req REQ-096
  it("creates protected records with private defaults and the complete lifecycle state", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS protected_records/);
    expect(migration).toMatch(/visibility TEXT NOT NULL DEFAULT 'private'/);
    expect(migration).toMatch(/rights_basis TEXT NOT NULL/);
    expect(migration).toMatch(/consent_scope TEXT NOT NULL/);
    expect(migration).toMatch(/embargo_until TIMESTAMPTZ/);
    expect(migration).toMatch(/retention_until TIMESTAMPTZ/);
    expect(migration).toMatch(/withdrawn_at TIMESTAMPTZ/);
    expect(migration).toMatch(
      /community_review_status TEXT NOT NULL DEFAULT 'pending'/
    );
  });

  // @req REQ-096
  it("keeps binary storage private and grants no anonymous access by default", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/INSERT INTO storage\.buckets/);
    expect(migration).toMatch(/'protected-records', false/);
    expect(migration).toMatch(
      /ALTER TABLE protected_records ENABLE ROW LEVEL SECURITY/
    );
    expect(migration).toMatch(/protected_records_editorial_select/);
    expect(migration).not.toMatch(/protected_records_read_public/);
    expect(migration).toMatch(/protected_records_storage_editorial_select/);
  });

  // @req REQ-096
  it("records state transitions without retaining protected reasons or evidence", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(
      /CREATE TABLE IF NOT EXISTS protected_record_audit/
    );
    expect(migration).toMatch(/action TEXT NOT NULL/);
    expect(migration).toMatch(
      /previous_state JSONB NOT NULL DEFAULT '{}'::JSONB/
    );
    expect(migration).toMatch(/next_state JSONB NOT NULL DEFAULT '{}'::JSONB/);
    expect(migration).toMatch(/protected_record_audit_append_only/);
    expect(migration).toMatch(/protected_record_audit rows are append-only/);
  });

  // @req REQ-096
  it("is safe to reapply", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS/);
    expect(migration).toMatch(/DROP POLICY IF EXISTS/);
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION/);
  });
});

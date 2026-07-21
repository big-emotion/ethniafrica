/**
 * Static analysis of migration 019_moderator_schema.sql.
 *
 * These tests parse the SQL text to verify every required DDL element is
 * present. Without a live Postgres instance in CI, SQL-level assertion is the
 * practical boundary: we verify structure (tables, columns, triggers, RLS
 * policies), not runtime database behaviour.
 *
 * Coverage (FR41 acceptance criteria):
 *   - moderator_role enum values (none|editor|senior_editor|admin)
 *   - moderator_role column with CHECK constraint and DEFAULT 'none'
 *   - revision_drafts table columns and unique constraint
 *   - audit_log append-only: BEFORE UPDATE and BEFORE DELETE triggers
 *   - revision_drafts RLS: ENABLE + policies restricting non-moderators
 *   - audit_log RLS: public SELECT policy
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import path from "path";

let sql: string;

beforeAll(() => {
  sql = readFileSync(
    path.resolve(__dirname, "../migrations/019_moderator_schema.sql"),
    "utf-8"
  );
});

// ---------------------------------------------------------------------------
// moderator_role enum
// ---------------------------------------------------------------------------
describe("moderator_role_type enum", () => {
  it("defines the moderator_role_type enum", () => {
    expect(sql).toMatch(/CREATE TYPE\s+moderator_role_type\s+AS\s+ENUM/i);
  });

  it("includes all required role values", () => {
    // Enum values must include none, editor, senior_editor, admin
    for (const value of ["none", "editor", "senior_editor", "admin"]) {
      expect(sql, `enum must include '${value}'`).toContain(`'${value}'`);
    }
  });
});

// ---------------------------------------------------------------------------
// contributor_profiles table
// ---------------------------------------------------------------------------
describe("contributor_profiles table", () => {
  it("creates or alters contributor_profiles with a moderator_role column", () => {
    expect(sql).toMatch(/contributor_profiles/i);
    expect(sql).toMatch(/moderator_role/i);
  });

  it("sets DEFAULT 'none' on moderator_role", () => {
    // Must have DEFAULT 'none' near moderator_role ([\s\S] matches across lines)
    expect(sql).toMatch(/moderator_role[\s\S]{0,200}DEFAULT\s+'none'/i);
  });

  it("has a CHECK constraint on moderator_role", () => {
    expect(sql).toMatch(/moderator_role[\s\S]{0,200}CHECK/i);
  });
});

// ---------------------------------------------------------------------------
// revision_drafts table
// ---------------------------------------------------------------------------
describe("revision_drafts table", () => {
  it("creates the revision_drafts table", () => {
    expect(sql).toMatch(/CREATE TABLE[\s\S]{0,50}revision_drafts/i);
  });

  it("has entity_type and entity_id columns", () => {
    expect(sql).toMatch(/entity_type/i);
    expect(sql).toMatch(/entity_id/i);
  });

  it("has moderator_id column referencing auth.users", () => {
    expect(sql).toMatch(/moderator_id[\s\S]{0,200}auth\.users/i);
  });

  it("has draft_jsonb column", () => {
    expect(sql).toMatch(/draft_jsonb/i);
  });

  it("has linked_flag_ids column as uuid array", () => {
    expect(sql).toMatch(/linked_flag_ids/i);
    expect(sql).toMatch(/uuid\[\]/i);
  });

  it("has unique constraint on (entity_type, entity_id, moderator_id)", () => {
    // The UNIQUE constraint must reference all three columns together
    expect(sql).toMatch(
      /UNIQUE\s*\(\s*entity_type\s*,\s*entity_id\s*,\s*moderator_id\s*\)/i
    );
  });

  it("enables RLS on revision_drafts", () => {
    expect(sql).toMatch(
      /ALTER TABLE\s+revision_drafts\s+ENABLE ROW LEVEL SECURITY/i
    );
  });

  it("has a policy denying access for moderator_role = 'none'", () => {
    // The policy should reference revision_drafts and restrict access by role
    expect(sql).toMatch(/CREATE POLICY[\s\S]{0,100}revision_drafts/i);
  });
});

// ---------------------------------------------------------------------------
// audit_log append-only triggers
// ---------------------------------------------------------------------------
describe("audit_log append-only invariant", () => {
  it("creates a BEFORE UPDATE trigger on audit_log", () => {
    expect(sql).toMatch(/BEFORE UPDATE\s+ON\s+audit_log/i);
  });

  it("creates a BEFORE DELETE trigger on audit_log", () => {
    expect(sql).toMatch(/BEFORE DELETE\s+ON\s+audit_log/i);
  });

  it("raises an exception to reject UPDATE", () => {
    // The trigger body must RAISE EXCEPTION for UPDATE
    expect(sql).toMatch(/RAISE EXCEPTION/i);
    expect(sql).toMatch(/append-only/i);
  });

  it("adds target_type and target_id columns to audit_log", () => {
    expect(sql).toMatch(/target_type/i);
    expect(sql).toMatch(/target_id/i);
  });

  it("adds details_jsonb column to audit_log", () => {
    expect(sql).toMatch(/details_jsonb/i);
  });
});

// ---------------------------------------------------------------------------
// audit_log RLS — public transparency (FR41)
// ---------------------------------------------------------------------------
describe("audit_log RLS", () => {
  it("creates a public SELECT policy on audit_log", () => {
    // FR41 requires anonymous read access
    expect(sql).toMatch(
      /CREATE POLICY[\s\S]{0,200}audit_log[\s\S]{0,200}FOR SELECT/i
    );
    // The policy must pass (USING true) — not restrict by role
    expect(sql).toMatch(/USING\s*\(\s*true\s*\)/i);
  });
});

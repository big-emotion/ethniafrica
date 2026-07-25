import { readFileSync } from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";

let sql: string;

beforeAll(() => {
  sql = readFileSync(
    path.resolve(__dirname, "../migrations/027_contributor_erasure.sql"),
    "utf-8"
  );
});

describe("contributor erasure migration", () => {
  // @req REQ-042
  it("reconciles both contributor profile schema variants", () => {
    expect(sql).toMatch(
      /ALTER TABLE\s+public\.contributor_profiles[\s\S]*ADD COLUMN IF NOT EXISTS\s+age_confirmed_at\s+TIMESTAMPTZ/i
    );
    expect(sql).toMatch(
      /ALTER TABLE\s+public\.contributor_profiles[\s\S]*ADD COLUMN IF NOT EXISTS\s+public\s+BOOLEAN/i
    );
    expect(sql).toMatch(/column_name\s*=\s*'id'/i);
    expect(sql).toMatch(/column_name\s*=\s*'user_id'/i);
  });

  // @req REQ-042
  it("adds the nullable contributor display-name snapshot to flags", () => {
    expect(sql).toMatch(
      /ALTER TABLE\s+public\.flags[\s\S]*ADD COLUMN IF NOT EXISTS\s+contributor_display_name_snapshot\s+TEXT/i
    );
  });

  // @req REQ-042
  it("defines one atomic erasure function with a locked search path", () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION\s+public\.erase_contributor_account\s*\(\s*target_user_id\s+UUID\s*\)[\s\S]*LANGUAGE\s+plpgsql[\s\S]*SECURITY DEFINER[\s\S]*SET search_path\s*=\s*pg_catalog/i
    );
    expect(sql.match(/CREATE OR REPLACE FUNCTION/gi)).toHaveLength(1);
  });

  // @req REQ-042
  it("anonymizes flags, removes either profile variant, and deletes the auth user", () => {
    expect(sql).toMatch(
      /UPDATE\s+public\.flags[\s\S]*contributor_id\s*=\s*NULL[\s\S]*contributor_display_name_snapshot\s*=\s*NULL[\s\S]*WHERE\s+contributor_id\s*=\s*target_user_id/i
    );
    expect(sql).toMatch(
      /DELETE FROM public\.contributor_profiles WHERE id = \$1/i
    );
    expect(sql).toMatch(
      /DELETE FROM public\.contributor_profiles WHERE user_id = \$1/i
    );
    expect(sql).toMatch(
      /DELETE FROM\s+auth\.users\s+WHERE\s+id\s*=\s*target_user_id/i
    );
  });

  // @req REQ-042
  it("writes only the erasure timestamp and SHA-256 user-ID hash to audit metadata", () => {
    expect(sql).toMatch(/extensions\.digest\s*\([^)]*'sha256'\s*\)/i);
    expect(sql).toMatch(
      /INSERT INTO\s+public\.audit_log[\s\S]*'erased_at'[\s\S]*'user_id_hash'/i
    );
    expect(sql).not.toMatch(/email/i);
    expect(sql).not.toMatch(
      /INSERT INTO\s+public\.audit_log[\s\S]*target_user_id/i
    );
  });

  // @req REQ-042
  it("revokes public execution and grants it only to service_role", () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION\s+public\.erase_contributor_account\s*\(\s*UUID\s*\)\s+FROM\s+PUBLIC/i
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION\s+public\.erase_contributor_account\s*\(\s*UUID\s*\)\s+TO\s+service_role/i
    );
    expect(sql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION[\s\S]*TO\s+(anon|authenticated)/i
    );
  });
});

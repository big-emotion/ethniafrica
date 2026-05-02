import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase/migrations");

function readMigrationFile(filename: string): string {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  return fs.readFileSync(filePath, "utf-8");
}

describe("Migration 008: Module Zero Fabric", () => {
  const filename = "008_module_zero_fabric.sql";

  it("should exist", () => {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should contain CREATE TABLE for sources", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS sources/i);
  });

  it("should contain CREATE TABLE for revisions", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS revisions/i);
  });

  it("should contain CREATE TABLE for audit_log", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS audit_log/i);
  });

  it("should contain CREATE TABLE for editorial_doctrine", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS editorial_doctrine/i);
  });

  it("should contain CREATE TABLE for user_roles", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS user_roles/i);
  });

  it("should have RLS enabled on all tables", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/ALTER TABLE sources ENABLE ROW LEVEL SECURITY/i);
    expect(content).toMatch(/ALTER TABLE revisions ENABLE ROW LEVEL SECURITY/i);
    expect(content).toMatch(/ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY/i);
    expect(content).toMatch(
      /ALTER TABLE editorial_doctrine ENABLE ROW LEVEL SECURITY/i
    );
    expect(content).toMatch(
      /ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY/i
    );
  });

  it("should have public read policies", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/FOR SELECT USING \(true\)/i);
  });
});

describe("Migration 009: Classification Status Enum", () => {
  const filename = "009_classification_status_enum.sql";

  it("should exist", () => {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should contain classification_status enum type", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TYPE classification_status AS ENUM/i);
  });

  it("should contain ALTER TABLE for afrik_peoples", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(
      /ALTER TABLE afrik_peoples ADD COLUMN classification_status/i
    );
  });

  it("should contain ALTER TABLE for afrik_language_families", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(
      /ALTER TABLE afrik_language_families ADD COLUMN classification_status/i
    );
  });
});

describe("Migration 010: Assertions and Triggers", () => {
  const filename = "010_assertions_triggers.sql";

  it("should exist", () => {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should contain CREATE TABLE for assertions", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS assertions/i);
  });

  it("should contain CREATE TABLE for confidence_scores", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS confidence_scores/i);
  });

  it("should contain CREATE TABLE for flags", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS flags/i);
  });

  it("should contain the trigger function update_updated_at_column", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(
      /CREATE OR REPLACE FUNCTION update_updated_at_column\(\)/i
    );
  });

  it("should have RLS enabled on all tables", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(
      /ALTER TABLE assertions ENABLE ROW LEVEL SECURITY/i
    );
    expect(content).toMatch(
      /ALTER TABLE confidence_scores ENABLE ROW LEVEL SECURITY/i
    );
    expect(content).toMatch(/ALTER TABLE flags ENABLE ROW LEVEL SECURITY/i);
  });

  it("should have public read policies", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/FOR SELECT USING \(true\)/i);
  });
});

describe("Migration 011: API Keys", () => {
  const filename = "011_api_keys.sql";

  it("should exist", () => {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should contain CREATE TABLE for api_keys", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS api_keys/i);
  });

  it("should have RLS enabled", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY/i);
  });

  it("should have public read policies", () => {
    const content = readMigrationFile(filename);
    expect(content).toMatch(/FOR SELECT USING \(true\)/i);
  });
});

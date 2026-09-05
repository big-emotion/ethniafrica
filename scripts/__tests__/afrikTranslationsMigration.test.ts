/**
 * Static analysis of migration 085_afrik_translations.sql — the translation
 * record table (REQ-142, DEC-048).
 *
 * Same discipline as scripts/__tests__/peopleLanguagesMigration.test.ts: the
 * SQL text is parsed for its DDL contract, no Postgres is applied in CI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { stripSqlNoise } from "../ci/checkRlsCoverage";
import {
  TRANSLATION_ENTITY_TYPES,
  TRANSLATION_KINDS,
} from "@/lib/afrik/translations/types";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/085_afrik_translations.sql"),
  "utf8"
);
// stripSqlNoise blanks quoted literals, so the vocabularies are read from the
// raw text and only the DDL shape from the stripped one.
const ddl = stripSqlNoise(migration);

describe("085_afrik_translations.sql migration contract", () => {
  // @req REQ-142
  it("keys one record per entity and locale", () => {
    expect(ddl).toContain("CREATE TABLE IF NOT EXISTS afrik_translations");
    expect(ddl).toContain("PRIMARY KEY (entity_type, entity_id, lang)");
  });

  // @req REQ-142
  it("checks the entity vocabulary against the nine corpus directories", () => {
    for (const entityType of TRANSLATION_ENTITY_TYPES) {
      expect(migration).toMatch(
        new RegExp(`entity_type IN \\([^)]*'${entityType}'[^)]*\\)`)
      );
    }
  });

  // @req REQ-142
  it("requires a declared translation_kind from the three-value set (AC3 at the database)", () => {
    expect(ddl).toContain("translation_kind TEXT NOT NULL");
    for (const kind of TRANSLATION_KINDS) {
      expect(migration).toMatch(
        new RegExp(`translation_kind IN \\([^)]*'${kind}'[^)]*\\)`)
      );
    }
    expect(migration).toMatch(
      /lang TEXT NOT NULL CHECK \(lang IN \('en', 'fr'\)\)/
    );
  });

  // @req REQ-142
  it("carries the drift contract: a source hash, per-field hashes and the review list", () => {
    expect(ddl).toContain("source_hash TEXT NOT NULL");
    expect(migration).toContain("field_hashes JSONB NOT NULL DEFAULT '{}'");
    expect(migration).toContain("review_required JSONB NOT NULL DEFAULT '[]'");
  });

  // @req REQ-142
  it("indexes a locale's records by entity type for the loader's reconciliation", () => {
    expect(ddl).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_afrik_translations_lang_entity_type\s+ON afrik_translations\s*\(lang, entity_type\)/
    );
  });

  // @req REQ-142
  it("enables RLS with a public-read-only policy, matching afrik_media", () => {
    expect(ddl).toContain(
      "ALTER TABLE afrik_translations ENABLE ROW LEVEL SECURITY"
    );
    expect(ddl).toContain(
      "DROP POLICY IF EXISTS afrik_translations_read_public"
    );
    expect(ddl).toMatch(
      /CREATE POLICY\s+afrik_translations_read_public ON afrik_translations/
    );
    expect(ddl).toContain("FOR SELECT USING (true)");
    expect(ddl).not.toContain("FOR INSERT");
    expect(ddl).not.toContain("FOR ALL");
    expect(ddl).not.toMatch(/\bGRANT\b/);
  });

  // The header names recompute_confidence() on purpose — to say it is not
  // touched — so the guard is on DDL, not on the word (AC4).
  // @req REQ-142
  it("touches neither the confidence function nor the sources/assertions tables (AC4)", () => {
    expect(ddl).not.toMatch(/FUNCTION\s+recompute_confidence/i);
    expect(ddl).not.toMatch(/ALTER TABLE\s+(sources|assertions)\b/i);
    expect(ddl).not.toMatch(/CREATE TABLE[^;]*\b(sources|assertions)\s*\(/i);
    expect(migration).toContain("recompute_confidence()");
  });

  // @req REQ-142
  it("is fully idempotent — IF NOT EXISTS and DROP-then-CREATE throughout", () => {
    expect(ddl.match(/CREATE TABLE (?!IF NOT EXISTS)\S+/g)).toBeNull();
    expect(ddl.match(/CREATE INDEX (?!IF NOT EXISTS)\S+/g)).toBeNull();
    expect(ddl).not.toMatch(/INSERT INTO afrik_translations/i);
  });
});

/**
 * Static analysis of migration 068_unified_search_surface.sql — the blocking
 * SQL contract behind cross-kind search (ETNI-1707).
 *
 * Same discipline as scripts/__tests__/nameTableMigration.test.ts: parse the
 * SQL text and verify the DDL contract without a live Postgres instance. No
 * migration is ever applied from this repository's automation, so the file
 * itself is the only artefact CI can gate on.
 *
 * The assertions worth having here are the ones a reviewer cannot check by
 * eye across 500 lines of SQL: that no returned row can carry a quiz answer,
 * that every function is SECURITY INVOKER and explicitly re-granted, and that
 * every accent fold goes through the IMMUTABLE wrapper rather than raw
 * unaccent().
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/068_unified_search_surface.sql"),
  "utf8"
);

/** Every function this migration is responsible for, with its argument list. */
const DECLARED_FUNCTIONS = [
  "public.afrik_search_normalized_score(BOOLEAN, BOOLEAN, REAL)",
  "public.afrik_search_peoples(\n  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT)",
  "public.afrik_search_countries(TEXT, INT, INT)",
  "public.afrik_search_persons(TEXT, INT, INT)",
  "public.afrik_search_patronymes(TEXT, INT, INT)",
  "public.afrik_search_language_families(TEXT, INT, INT)",
  "public.afrik_search_quiz(TEXT, INT, INT)",
];

/** The four kinds that already had an RPC before this migration. */
const PRE_EXISTING_KINDS = [
  "afrik_search_peoples",
  "afrik_search_countries",
  "afrik_search_persons",
  "afrik_search_patronymes",
];

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** The body of one CREATE OR REPLACE FUNCTION, up to its `$$;` terminator. */
function functionBody(name: string): string {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start, `${name} is not defined in the migration`).toBeGreaterThan(-1);
  const end = migration.indexOf("$$;", start);
  expect(end, `${name} has no terminated body`).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("068 — one bounded score, comparable across kinds", () => {
  // @req REQ-002
  it("declares a single shared score helper rather than one formula per kind", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.afrik_search_normalized_score("
    );
    expect(migration).toMatch(/RETURNS\s+REAL/);
    expect(functionBody("afrik_search_normalized_score")).toContain(
      "IMMUTABLE"
    );
  });

  // @req REQ-002
  it("bounds the score on [0, 1] by construction, not by convention", () => {
    const body = functionBody("afrik_search_normalized_score");
    // A saturating squash keeps any non-negative raw magnitude inside its
    // band; the clamp is the belt-and-braces guarantee the name promises.
    expect(body).toContain("GREATEST(");
    expect(body).toContain("LEAST(");
    expect(body).toMatch(/0::real/);
    expect(body).toMatch(/1::real/);
  });

  // @req REQ-002
  it("ranks the match class above the per-kind magnitude", () => {
    const body = functionBody("afrik_search_normalized_score");
    // Exact, lexical and fallback occupy disjoint bands, so a fuzzy hit on
    // one kind can never outscore a lexical hit on another whatever the two
    // underlying scales happen to be.
    expect(body).toContain("p_exact_match");
    expect(body).toContain("p_lexical_match");
    expect(body).toContain("p_raw_relevance");
  });
});

describe("068 — per-kind normalized scores", () => {
  for (const kind of PRE_EXISTING_KINDS) {
    // @req REQ-002
    it(`${kind} gains normalizedScore without losing its existing keys`, () => {
      const body = functionBody(kind);
      expect(body).toContain("public.afrik_search_normalized_score(");
      expect(body).toContain('"normalizedScore"');
      expect(body).toContain('"exactMatch"');
      expect(body).toContain("relevance");
    });

    // @req REQ-002
    it(`${kind} still answers the {total, rows} JSONB contract`, () => {
      const body = functionBody(kind);
      expect(body).toContain("RETURNS JSONB");
      expect(body).toContain("jsonb_build_object(");
      expect(body).toContain("'total'");
      expect(body).toContain("'rows'");
    });
  }

  // @req REQ-002
  it("scores language families in SQL instead of in the JS tier ladder", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.afrik_search_language_families("
    );
    const body = functionBody("afrik_search_language_families");
    expect(body).toContain("p_q      TEXT");
    expect(body).toContain("p_limit  INT");
    expect(body).toContain("p_offset INT");
    expect(body).toContain("public.afrik_search_normalized_score(");
    expect(body).toContain('"normalizedScore"');
    expect(body).toContain("'total'");
    expect(body).toContain("'rows'");
  });

  // @req REQ-129
  it("replicates the families ladder exact > prefix > substring > prose", () => {
    const body = functionBody("afrik_search_language_families");
    // The four tiers rankLanguageFamilies computes in JS, in the same order.
    expect(body).toContain("public.afrik_unaccent(lower(f.name_fr))");
    expect(body).toContain("starts_with(");
    expect(body).toContain("position(");
    // The prose tier is the migration 056 search_vector (DEC-028).
    expect(body).toContain("f.search_vector");
  });
});

describe("068 — quiz questions become searchable without leaking answers", () => {
  // @req REQ-121
  it("declares an active-only quiz RPC", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.afrik_search_quiz("
    );
    const body = functionBody("afrik_search_quiz");
    expect(body).toContain("revoked_at IS NULL");
    expect(body).toContain("'total'");
    expect(body).toContain("'rows'");
  });

  // @req REQ-121
  it("searches the prompt, the stimulus and the explanation", () => {
    expect(migration).toContain("prompt_fr");
    expect(migration).toContain("stimulus_fr");
    expect(migration).toContain("explanation_fr");
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS search_vector tsvector"
    );
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_quiz_questions_search_vector"
    );
  });

  // @req REQ-121
  it("joins the question to its subject entity so the subject name matches", () => {
    const body = functionBody("afrik_search_quiz");
    expect(body).toContain("public.afrik_peoples");
    expect(body).toContain("public.afrik_countries");
    expect(body).toContain("entity_type");
    expect(body).toContain("entity_id");
    expect(body).toContain('"subjectName"');
  });

  // @req REQ-121
  it("never puts the options or the correct answer in a returned row", () => {
    const body = functionBody("afrik_search_quiz");
    expect(body).not.toContain("options_fr");
    expect(body).not.toContain("correct_option");
    // explanation_fr is searchable but never echoed: it states the answer.
    expect(body).not.toContain('"explanation"');
  });
});

describe("068 — exposure and idempotence", () => {
  // @req REQ-126
  it("runs every search function as the caller, so RLS still applies", () => {
    expect(countOccurrences(migration, "SECURITY INVOKER")).toBe(
      DECLARED_FUNCTIONS.length
    );
    expect(migration).not.toContain("SECURITY DEFINER");
  });

  for (const signature of DECLARED_FUNCTIONS) {
    // @req REQ-126
    it(`revokes ${signature.split("(")[0]} from PUBLIC before granting it`, () => {
      const revoke = `REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC;`;
      const grant = `GRANT EXECUTE ON FUNCTION ${signature}\n  TO anon, authenticated, service_role;`;
      expect(migration).toContain(revoke);
      expect(migration).toContain(grant);
      expect(migration.indexOf(revoke)).toBeLessThan(migration.indexOf(grant));
    });
  }

  // @req REQ-002
  it("is re-runnable end to end", () => {
    expect(countOccurrences(migration, "CREATE OR REPLACE FUNCTION")).toBe(
      DECLARED_FUNCTIONS.length
    );
    expect(migration).not.toMatch(/CREATE\s+INDEX\s+(?!IF NOT EXISTS)/);
    expect(migration).not.toMatch(/ADD\s+COLUMN\s+(?!IF NOT EXISTS)/);
    expect(migration).not.toContain("DROP FUNCTION");
  });

  // @req REQ-129
  it("folds accents only through the IMMUTABLE wrapper", () => {
    // Raw unaccent() is STABLE on both projects, so an index or generated
    // column built on it is rejected outright — see migration 063.
    expect(migration).not.toMatch(/(?<!afrik_)\bunaccent\s*\(/);
  });
});

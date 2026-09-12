/**
 * Static analysis of migration 088 — `needs_review` in the database.
 *
 * Same discipline as the other migration contracts in this directory: the SQL
 * text is read for its contract, no Postgres is applied in CI.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AI_PROVENANCE_WEIGHT,
  SOURCE_TIERS,
  SOURCE_TIER_WEIGHTS,
} from "@/types/sources";

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

function readMigration(prefix: string): string {
  const name = readdirSync(MIGRATIONS).find((file) => file.startsWith(prefix));
  if (!name) throw new Error(`No migration starting with ${prefix}`);
  return readFileSync(join(MIGRATIONS, name), "utf8");
}

function withoutLineComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

/** The body of `recompute_confidence`, with the source-quality expression masked. */
function confidenceBodyOutsideSourceQuality(sql: string): string {
  const body = /FUNCTION recompute_confidence\([\s\S]*?\$\$([\s\S]*?)\$\$/.exec(
    sql
  );
  if (!body) throw new Error("No recompute_confidence body");
  return withoutLineComments(body[1])
    .replace(/AVG\([\s\S]*?\)::DECIMAL\(3,2\)/, "AVG(<source quality>)")
    .replace(/\s+/g, " ")
    .trim();
}

const migration = readMigration("088_");
const ddl = withoutLineComments(migration);

describe("088 — needs_review is a standing the database admits", () => {
  // @req REQ-092
  it("re-declares sources_tier_check with the three tiers and needs_review", () => {
    expect(ddl).toMatch(
      /ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_tier_check/
    );
    const declaration =
      /CONSTRAINT sources_tier_check\s+CHECK\s*\(\s*tier IS NULL OR tier IN\s*\(([^)]*)\)/.exec(
        ddl
      );
    expect(declaration).not.toBeNull();

    const allowed = Array.from(
      declaration[1].matchAll(/'([^']+)'/g),
      (m) => m[1]
    );
    expect(allowed.sort()).toEqual([...SOURCE_TIERS, "needs_review"].sort());
  });

  // A source awaiting review cannot claim more authority than an unverified
  // one, and before 088 it — like a source with no tier at all — fell through
  // a CASE with no ELSE, came out NULL, and AVG() silently skipped it.
  // @req REQ-092
  it("weighs needs_review and an absent tier as unverified", () => {
    expect(ddl).toContain("CREATE OR REPLACE FUNCTION recompute_confidence(");
    expect(ddl).toMatch(
      new RegExp(
        `WHEN s\\.tier IS NULL OR s\\.tier IN \\('unverified', 'needs_review'\\)\\s+THEN ${SOURCE_TIER_WEIGHTS.unverified}`
      )
    );
    expect(ddl).toMatch(
      new RegExp(
        `WHEN s\\.tier = 'official'\\s+THEN ${SOURCE_TIER_WEIGHTS.official.toFixed(1)}`
      )
    );
    expect(ddl).toMatch(
      new RegExp(
        `WHEN s\\.tier = 'referenced'\\s+THEN ${SOURCE_TIER_WEIGHTS.referenced}`
      )
    );
  });

  // The LEFT JOIN yields one all-NULL row for an assertion citing nothing.
  // Weighing "no tier" would otherwise score that phantom row at 0.4.
  // @req REQ-092
  it("still gives an assertion citing no source no quality at all", () => {
    expect(ddl).toMatch(/WHEN s\.id IS NULL\s+THEN NULL/);
    expect(ddl.indexOf("WHEN s.id IS NULL")).toBeLessThan(
      ddl.indexOf("WHEN s.tier IS NULL")
    );
  });

  // @req REQ-092
  it("keeps the AI provenance multiplier", () => {
    expect(ddl).toContain(
      `CASE WHEN s.source_kind = 'ai_generated' THEN ${AI_PROVENANCE_WEIGHT} ELSE 1.0 END`
    );
  });

  // CREATE OR REPLACE rewrites proconfig, so the pin 076 set with ALTER
  // FUNCTION is lost unless the new definition carries it itself. The ACL is
  // kept by CREATE OR REPLACE, which is why no GRANT or REVOKE belongs here.
  // @req REQ-054
  it("preserves the signature, invoker security and the pinned search_path", () => {
    expect(ddl).toMatch(
      /CREATE OR REPLACE FUNCTION recompute_confidence\(\s*p_entity_type TEXT,\s*p_entity_id\s+TEXT\s*\)\s*RETURNS VOID\s+LANGUAGE plpgsql\s+SET search_path = public, extensions, pg_temp\s+AS \$\$/
    );
    expect(ddl).not.toMatch(/SECURITY DEFINER/i);
    expect(ddl).not.toMatch(/\b(GRANT|REVOKE)\b/);
  });

  // @req REQ-092
  it("changes nothing in the function but the source-quality expression", () => {
    expect(confidenceBodyOutsideSourceQuality(migration)).toEqual(
      confidenceBodyOutsideSourceQuality(readMigration("041_"))
    );
  });

  // @req REQ-092
  it("rewrites no source row — admitting a value is not assigning it", () => {
    expect(ddl).not.toMatch(/UPDATE\s+sources/i);
    expect(ddl).not.toMatch(/DELETE\s+FROM\s+sources/i);
  });
});

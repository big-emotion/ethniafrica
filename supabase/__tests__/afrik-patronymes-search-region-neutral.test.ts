/**
 * Static contract for AC1 of ETNI-1463 (ETNI-1741): `afrik_search_patronymes`
 * must rank two name fiches of equal evidential strength equally regardless
 * of the region they come from.
 *
 * Unit tests do not connect to a live Supabase instance, so this reads the
 * migration's SQL text directly and asserts the function's ranking never
 * reads a geographic column: it selects only from `afrik_patronymes`, joined
 * with the parsed query (`q`), and ranks purely on `exact_match` →
 * `lexical_match` → `relevance` (accent/apostrophe-insensitive match, then
 * lexical/phonetic tier, then pg_trgm similarity) → name → id. If a
 * country/region term were ever added to that ranking, this test fails.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/069_unified_search_surface.sql"
);

function patronymesFunctionBody(): string {
  const sql = readFileSync(migrationPath, "utf8");
  const start = sql.indexOf(
    "CREATE OR REPLACE FUNCTION public.afrik_search_patronymes"
  );
  const end = sql.indexOf(
    "COMMENT ON FUNCTION public.afrik_search_patronymes",
    start
  );
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

describe("afrik_search_patronymes region-neutral ranking (AC1)", () => {
  // @req REQ-135
  it("reads only afrik_patronymes and the parsed query, never a geographic table", () => {
    const fn = patronymesFunctionBody();

    expect(fn).toMatch(/FROM public\.afrik_patronymes p/);
    expect(fn).toMatch(/CROSS JOIN q/);

    // Every FROM target is either the one base table or one of this
    // function's own CTEs (q, matched, page, enriched) — a region/country
    // table joined in would show up as a fifth, unexpected target here.
    const fromTargets = [...fn.matchAll(/\bFROM\s+([\w.]+)/gi)].map(
      (match) => match[1]
    );
    const allowed = new Set([
      "public.afrik_patronymes",
      "q",
      "matched",
      "page",
      "enriched",
    ]);
    for (const target of fromTargets) {
      expect(allowed.has(target)).toBe(true);
    }
    // CROSS JOIN q (asserted above) is the only join — no LEFT/INNER/RIGHT
    // join to a countries/regions table.
    expect(fn).not.toMatch(/\b(LEFT|RIGHT|INNER|FULL)\s+JOIN\b/i);
  });

  // @req REQ-135
  it("never lets a country/region term feed the relevance score", () => {
    const fn = patronymesFunctionBody();

    expect(fn).not.toMatch(/\b(country|countries|region|pays)\b/i);
  });

  // @req REQ-135
  it("orders purely on match tier, then name, then id — no geographic tie-break", () => {
    const fn = patronymesFunctionBody();

    expect(fn).toMatch(
      /ORDER BY m\.exact_match DESC, m\.lexical_match DESC, m\.relevance DESC,\s*\n\s*m\.name_main ASC, m\.id ASC/
    );
    expect(fn).toMatch(
      /ORDER BY e\.exact_match DESC, e\.lexical_match DESC,\s*\n\s*e\.relevance DESC, e\."nameMain" ASC, e\.id ASC/
    );
  });
});

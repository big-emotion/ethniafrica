/**
 * Static contract for the ETNI-1857 per-locale search migration.
 *
 * Unit tests do not connect to a live Supabase instance, so these assertions
 * pin what the migration a human will apply has to say: the English name
 * column, the locale column on the query log, and the four ranking functions
 * re-issued with `p_lang` — through DROP then CREATE, never CREATE OR
 * REPLACE alone, because a new parameter list beside the old one is an
 * overload PostgREST refuses as ambiguous (PGRST203).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/082_afrik_search_english_names.sql"
);

function migrationSql(): string {
  return readFileSync(migrationPath, "utf8");
}

/** Everything from the function's DROP to its GRANT, so an assertion cannot match a sibling's body. */
function functionBlock(sql: string, name: string): string {
  const start = sql.indexOf(`DROP FUNCTION IF EXISTS public.${name}(`);
  const grant = sql.indexOf(`GRANT EXECUTE ON FUNCTION public.${name}(`);
  expect(start, `${name} is dropped before it is re-created`).toBeGreaterThan(
    -1
  );
  expect(grant, `${name} is granted after it is re-created`).toBeGreaterThan(
    start
  );
  return sql.slice(start, sql.indexOf(";", grant) + 1);
}

const RE_ISSUED = {
  afrik_search_peoples:
    "TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT",
  afrik_search_countries: "TEXT, INT, INT",
  afrik_search_language_families: "TEXT, INT, INT",
  afrik_search_languages: "TEXT, INT, INT",
} as const;

describe("AFRIK per-locale search migration (ETNI-1857)", () => {
  // @req REQ-143
  it("gives afrik_countries an English name column, additively", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /ALTER TABLE public\.afrik_countries\s+ADD COLUMN IF NOT EXISTS name_en TEXT/i
    );
    expect(sql).toMatch(/COMMENT ON COLUMN public\.afrik_countries\.name_en/);
  });

  // @req REQ-141
  it("records the locale of every logged query, backfilling history as French with no default", () => {
    const sql = migrationSql();

    expect(sql).toMatch(
      /ALTER TABLE public\.search_query_log\s+ADD COLUMN IF NOT EXISTS lang TEXT;/
    );
    const backfill = sql.search(
      /UPDATE public\.search_query_log SET lang = 'fr' WHERE lang IS NULL/
    );
    const notNull = sql.search(/ALTER COLUMN lang SET NOT NULL/);
    expect(backfill).toBeGreaterThan(-1);
    expect(notNull).toBeGreaterThan(backfill);
    expect(sql).toMatch(/CHECK \(lang IN \('en', 'fr'\)\)/);
    // No default: a writer that does not say which locale it served is a bug
    // to surface, not a French query to assume.
    expect(sql).not.toMatch(/ADD COLUMN IF NOT EXISTS lang TEXT[^;]*DEFAULT/i);
    expect(sql).not.toMatch(/ALTER COLUMN lang SET DEFAULT/i);
  });

  // @req REQ-141
  it.each(Object.entries(RE_ISSUED))(
    "re-issues %s with a trailing p_lang through DROP then CREATE",
    (name, oldSignature) => {
      const sql = migrationSql();
      const block = functionBlock(sql, name);

      expect(block).toContain(
        `DROP FUNCTION IF EXISTS public.${name}(${oldSignature});`
      );
      expect(block).toMatch(
        new RegExp(
          `CREATE OR REPLACE FUNCTION public\\.${name}\\([^)]*p_lang\\s+TEXT\\s+DEFAULT 'fr'\\s*\\)`
        )
      );
      expect(block).toMatch(/SECURITY INVOKER/);
      expect(block).toMatch(/SET search_path = public, extensions, pg_temp/);
      expect(block).toContain(
        `REVOKE ALL ON FUNCTION public.${name}(${oldSignature}, TEXT) FROM PUBLIC;`
      );
      expect(block).toMatch(
        new RegExp(
          `GRANT EXECUTE ON FUNCTION public\\.${name}\\(${oldSignature}, TEXT\\)\\s+TO anon, authenticated, service_role;`
        )
      );
    }
  );

  // @req REQ-002
  it("never creates a function without dropping its previous signature first (no overload)", () => {
    const sql = migrationSql();
    const created = [
      ...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(/g),
    ].map((match) => match[1]);

    expect(created.sort()).toEqual(Object.keys(RE_ISSUED).sort());
    for (const name of created) {
      expect(
        sql.indexOf(`DROP FUNCTION IF EXISTS public.${name}(`)
      ).toBeLessThan(sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`));
    }
  });

  // @req REQ-141
  it("lets an English reader reach a country by its English name, exactly and by prefix", () => {
    const block = functionBlock(migrationSql(), "afrik_search_countries");

    expect(block).toMatch(/p_lang = 'en'/);
    expect(block).toMatch(/public\.afrik_unaccent\(lower\(c\.name_en\)\)/);
    // The same ladder the families use (069): exact 1.0, prefix 0.6,
    // substring 0.3 — fifty-four rows need no vector, and an English name
    // must not go through the French stemmer.
    expect(block).toMatch(/= q\.exact_key THEN 1\.0::real/);
    expect(block).toMatch(/starts_with\([^)]*q\.exact_key\)\s+THEN 0\.6::real/);
    expect(block).toMatch(
      /position\(q\.exact_key IN [^)]*\) > 0\s+THEN 0\.3::real/
    );
    expect(block).toMatch(/page\.name_en\s+AS "nameEn"/);
  });

  // @req REQ-141
  it("runs the family ladder over the locale's name", () => {
    const block = functionBlock(
      migrationSql(),
      "afrik_search_language_families"
    );

    expect(block).toMatch(
      /CASE WHEN p_lang = 'en' THEN COALESCE\(f\.name_en, f\.name_fr\)\s+ELSE f\.name_fr END/
    );
    expect(block).toMatch(/page\.name_en\s+AS "nameEn"/);
  });

  // @req REQ-141
  it("reads the language's English name off its fiche content", () => {
    const block = functionBlock(migrationSql(), "afrik_search_languages");

    expect(block).toMatch(/l\.content ->> 'nameEn'/);
    expect(block).toMatch(/p_lang = 'en'/);
  });

  // @req REQ-141
  it("projects the family's English name beside the French one on every people row", () => {
    const block = functionBlock(migrationSql(), "afrik_search_peoples");

    expect(block).toMatch(/lf\.name_fr\s+AS "languageFamilyName"/);
    expect(block).toMatch(/lf\.name_en\s+AS "languageFamilyNameEn"/);
  });

  // @req REQ-002
  it("leaves the French ranking exactly where migrations 068 and 069 put it", () => {
    const sql = migrationSql();

    // No English text-search configuration: names are proper nouns and the
    // French vectors keep their French queries. The prose vector over the
    // translation records is a later story.
    expect(sql).not.toMatch(/'english'/);
    expect(sql).toMatch(/websearch_to_tsquery\('french', p_q\)/);
    expect(sql).toMatch(/afrik_search_normalized_score\(/);
  });
});

/**
 * Contract: one source-tier vocabulary, everywhere.
 *
 * `SourceTier` is declared once in `src/types/sources.ts` and every layer that
 * has an opinion about how much authority a citation carries — the authorized
 * source catalogue, the AFRIK fiche loaders, the Supabase schema, the public
 * API serializers and the UI — spells it the same way.
 *
 * The three vocabularies this replaces are banned by name so a future edit
 * cannot quietly reintroduce one:
 *   - `SourceTier = primary | secondary | tertiary | ai-enriched` (UI + sources.tier)
 *   - `EvidenceTier = 1 | 2 | null`                              (sources.evidence_tier)
 *   - `admission = preferred | allowed | discovery_only | …`     (catalogue)
 *
 * `source_kind` / `ai_generated` is deliberately NOT banned: provenance is the
 * orthogonal axis and it survives the sweep.
 *
 * Applied migrations are historical records. 015/016/029/031 keep their old
 * literals; only migrations from 040 forward are held to the new vocabulary.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import catalog from "../../../../config/sources/authorized-source-catalog.json";
import { sourceSchema } from "@/api/v2/schemas/sources";
import {
  SOURCE_PENDING_REVIEW_LABEL,
  SOURCE_TIER_LABELS,
  sourceStandingLabel,
} from "@/lib/glossaire/vocabularies";
import {
  AI_PROVENANCE_WEIGHT,
  SOURCE_KINDS,
  SOURCE_TIERS,
  SOURCE_TIER_WEIGHTS,
} from "@/types/sources";

const ROOT = join(__dirname, "..", "..", "..", "..");
const CODE_ROOTS = ["src", "scripts", "config"];
const CODE_EXTENSIONS = /\.(ts|tsx|json)$/;
const SKIPPED_DIRS = new Set([
  "node_modules",
  ".next",
  "known-failing",
  "test-results",
  "playwright-report",
  "storybook-static",
]);

/** This file names the retired vocabulary on purpose; it cannot police itself. */
const SELF = relative(ROOT, __filename).split(sep).join("/");

/**
 * Retired identifiers, banned outright. `admission` is matched as a whole word
 * so unrelated prose ("admissible") stays legal.
 *
 * The three `_FR`-suffixed names encoded the French-only assumption in the
 * identifier itself; the bilingual glossary (REQ-144) keys the same labels by
 * locale, so the suffix is retired with the assumption.
 */
const RETIRED_IDENTIFIERS = [
  /\bevidence_tier\b/,
  /\bevidenceTier\b/,
  /\bEvidenceTier\b/,
  /\bai-enriched\b/,
  /\badmissions?\b/i,
  /\bSOURCE_TIER_LABELS_FR\b/,
  /\bSOURCE_PENDING_REVIEW_LABEL_FR\b/,
  /\bsourceStandingLabelFr\b/,
];

/**
 * `primary` and `secondary` have honest non-tier lives in this codebase
 * (`data-cta="primary"`, `<Badge variant="secondary">`), so they are only
 * banned on a line that also talks about tiers. `tertiary` has no such life.
 */
const RETIRED_TIER_LITERAL = /["'](primary|secondary|tertiary)["']/;
const TIER_CONTEXT = /tier/i;

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && CODE_EXTENSIONS.test(entry.name)) out.push(full);
  }
}

function codeFiles(): string[] {
  const out: string[] = [];
  for (const dir of CODE_ROOTS) walk(join(ROOT, dir), out);
  return out
    .map((file) => relative(ROOT, file).split(sep).join("/"))
    .filter((file) => file !== SELF)
    .sort();
}

interface Offence {
  file: string;
  line: number;
  text: string;
}

function scanCode(matches: (line: string) => boolean): Offence[] {
  const offences: Offence[] = [];
  for (const file of codeFiles()) {
    const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
    lines.forEach((text, index) => {
      if (matches(text)) {
        offences.push({ file, line: index + 1, text: text.trim() });
      }
    });
  }
  return offences;
}

function migrationFiles(): string[] {
  const dir = join(ROOT, "supabase", "migrations");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function migrationNumber(name: string): number {
  return Number.parseInt(name.slice(0, 3), 10);
}

/**
 * The values a `… IN ('a', 'b', …)` CHECK constraint allows, read straight out
 * of the migration that declares it. The TS union and the SQL CHECK drifted
 * apart once already (031 allowed 11 source kinds, the union declared 8), so
 * they are compared rather than trusted.
 */
function checkConstraintValues(sql: string, constraintName: string): string[] {
  const declaration = new RegExp(
    `CONSTRAINT ${constraintName}\\s+CHECK[\\s\\S]*?IN\\s*\\(([^)]*)\\)`
  ).exec(sql);
  if (!declaration) throw new Error(`No CHECK … IN (…) for ${constraintName}`);
  return Array.from(declaration[1].matchAll(/'([^']+)'/g), (m) => m[1]);
}

function readMigration(prefix: string): string {
  const name = migrationFiles().find((file) => file.startsWith(prefix));
  if (!name) throw new Error(`No migration starting with ${prefix}`);
  return readFileSync(join(ROOT, "supabase", "migrations", name), "utf8");
}

describe("source tier vocabulary contract", () => {
  // @req REQ-092
  it("declares exactly three tiers, once, in src/types/sources.ts", () => {
    expect(SOURCE_TIERS).toEqual(["official", "referenced", "unverified"]);

    const declarations = scanCode((line) =>
      /export type SourceTier\s*=/.test(line)
    );
    expect(declarations.map((offence) => offence.file)).toEqual([
      "src/types/sources.ts",
    ]);
  });

  // @req REQ-092
  it("gives every tier a label in both locales and a confidence weight", () => {
    for (const locale of ["fr", "en"] as const) {
      expect(Object.keys(SOURCE_TIER_LABELS[locale]).sort(), locale).toEqual(
        [...SOURCE_TIERS].sort()
      );
    }
    expect(SOURCE_TIER_LABELS.fr).toEqual({
      official: "Officielle",
      referenced: "Référencée",
      unverified: "Non vérifiée",
    });
    expect(SOURCE_TIER_LABELS.en).toEqual({
      official: "Official",
      referenced: "Referenced",
      unverified: "Unverified",
    });
    expect(SOURCE_TIER_WEIGHTS).toEqual({
      official: 1.0,
      referenced: 0.7,
      unverified: 0.4,
    });
  });

  // @req REQ-092
  it("reproduces the retired ai-enriched weight as unverified × AI provenance", () => {
    expect(SOURCE_TIER_WEIGHTS.unverified * AI_PROVENANCE_WEIGHT).toBeCloseTo(
      0.2,
      10
    );
  });

  // @req REQ-092
  it("leaves no retired tier identifier anywhere in src, scripts or config", () => {
    const offences = scanCode((line) =>
      RETIRED_IDENTIFIERS.some((pattern) => pattern.test(line))
    );
    expect(offences).toEqual([]);
  });

  // @req REQ-092
  it("leaves no retired tier literal on a line that talks about tiers", () => {
    const offences = scanCode(
      (line) => TIER_CONTEXT.test(line) && RETIRED_TIER_LITERAL.test(line)
    );
    expect(offences).toEqual([]);
  });

  // @req REQ-092
  it("makes the catalogue speak the same three tiers", () => {
    for (const entry of catalog.entries) {
      expect(SOURCE_TIERS).toContain(entry.tier);
      expect(entry).not.toHaveProperty("admission");
      expect(entry).not.toHaveProperty("evidenceTier");
    }
  });

  // @req REQ-092
  it("makes the public API serializer refuse a retired tier value", () => {
    const source = {
      id: "11111111-1111-4111-8111-111111111111",
      sourceKey: null,
      sourceKind: null,
      identifiers: null,
      title: "Source",
      url: null,
      pinnedUrl: null,
      year: null,
      author: null,
      publisher: null,
      resolvable: null,
      lastVerifiedAt: null,
      notes: null,
      page: null,
      addedAt: null,
      policy: { key: "unknown", tier: "unverified", sourceKind: "unknown" },
    };
    expect(
      sourceSchema.safeParse({ ...source, tier: "official" }).success
    ).toBe(true);
    for (const retired of ["primary", "secondary", "tertiary", "ai-enriched"]) {
      expect(sourceSchema.safeParse({ ...source, tier: retired }).success).toBe(
        false
      );
    }
  });

  // @req REQ-092
  it("tiers discovery and AI-generated catalogue entries as unverified", () => {
    const carriesNoAuthority = catalog.entries.filter((entry) =>
      ["discovery", "ai_generated"].includes(entry.sourceKind)
    );
    expect(carriesNoAuthority.length).toBeGreaterThan(0);
    for (const entry of carriesNoAuthority) {
      expect(entry.tier).toBe("unverified");
    }
  });
});

describe("source tier vocabulary contract — Supabase schema", () => {
  // @req REQ-092
  it("keeps the retired literals only in the migrations that shipped them", () => {
    const dir = join(ROOT, "supabase", "migrations");
    const offenders = migrationFiles()
      .filter((name) => migrationNumber(name) >= 40)
      .filter((name) => {
        const sql = readFileSync(join(dir, name), "utf8");
        return (
          /'(primary|secondary|tertiary|ai-enriched)'/.test(sql) ||
          /\bevidence_tier\b/.test(sql)
        );
      })
      // 041 is the rename itself: it must name what it migrates away from.
      .filter((name) => !name.startsWith("041_"));
    expect(offenders).toEqual([]);
  });

  // @req REQ-092
  it("migrates sources.tier onto the three new values", () => {
    const sql = readMigration("041_");
    expect(sql).toContain("sources_tier_check");
    expect(sql).toContain("'official'");
    expect(sql).toContain("'referenced'");
    expect(sql).toContain("'unverified'");
    expect(sql).toMatch(/UPDATE sources[\s\S]*'ai_generated'/);
  });

  // @req REQ-092
  it("allows exactly the exported tiers in the sources_tier_check", () => {
    const allowed = checkConstraintValues(
      readMigration("041_"),
      "sources_tier_check"
    );
    expect([...allowed].sort()).toEqual([...SOURCE_TIERS].sort());
  });

  // @req REQ-092
  it("allows exactly the exported source kinds in the sources_source_kind_check", () => {
    const allowed = checkConstraintValues(
      readMigration("031_"),
      "sources_source_kind_check"
    );
    expect([...allowed].sort()).toEqual([...SOURCE_KINDS].sort());
  });

  // @req REQ-092
  it("drops the competing evidence_tier column and its check", () => {
    const sql = readMigration("041_");
    expect(sql).toContain("sources_evidence_tier_check");
    expect(sql).toContain("DROP COLUMN IF EXISTS evidence_tier");
  });

  // @req REQ-092
  it("rewrites recompute_confidence as tier weight × provenance multiplier", () => {
    const sql = readMigration("041_");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION recompute_confidence");
    expect(sql).toMatch(/WHEN 'official'\s+THEN 1\.0/);
    expect(sql).toMatch(/WHEN 'referenced'\s+THEN 0\.7/);
    expect(sql).toMatch(/WHEN 'unverified'\s+THEN 0\.4/);
    expect(sql).toMatch(/source_kind = 'ai_generated' THEN 0\.5/);
  });

  // @req REQ-092
  it("recreates every object that embedded a retired tier literal", () => {
    // 029 hard-codes tier IN ('primary','secondary') inside the name_records
    // source-or-drop trigger function. Left alone, the rename would make the
    // trigger reject every insert.
    expect(readMigration("029_")).toContain("tier IN ('primary', 'secondary')");

    const sql = readMigration("041_");
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION enforce_name_record_sources()"
    );
    expect(sql).toContain("tier IN ('official', 'referenced')");
  });
});

describe("sourceStandingLabel", () => {
  // A source nobody has judged is not a source judged weak. Folding
  // needs_review into "Non vérifiée" states a verdict no one reached, which
  // is the distinction the tier policy exists to keep visible.
  // @req REQ-092
  it("gives a source awaiting review a label of its own, in both locales", () => {
    expect(sourceStandingLabel("needs_review", "fr")).toBe(
      "En attente d'examen"
    );
    expect(sourceStandingLabel("needs_review", "en")).toBe("Awaiting review");
    for (const locale of ["fr", "en"] as const) {
      expect(sourceStandingLabel("needs_review", locale)).toBe(
        SOURCE_PENDING_REVIEW_LABEL[locale]
      );
      expect(sourceStandingLabel("needs_review", locale)).not.toBe(
        sourceStandingLabel("unverified", locale)
      );
    }
  });

  // @req REQ-092
  it("labels the three authority tiers as the policy names them", () => {
    expect(sourceStandingLabel("official", "fr")).toBe("Officielle");
    expect(sourceStandingLabel("referenced", "fr")).toBe("Référencée");
    expect(sourceStandingLabel("unverified", "fr")).toBe("Non vérifiée");
    expect(sourceStandingLabel("official", "en")).toBe("Official");
    expect(sourceStandingLabel("referenced", "en")).toBe("Referenced");
    expect(sourceStandingLabel("unverified", "en")).toBe("Unverified");
  });

  // strictNullChecks is off here, so an uncovered value resolves to undefined
  // and renders as literally nothing — a source with no visible provenance at
  // all, which is the one outcome the policy forbids.
  // @req REQ-092
  it("never renders nothing for a standing it does not recognise", () => {
    expect(sourceStandingLabel("tier-1" as never, "fr")).toBe(
      "En attente d'examen"
    );
    expect(sourceStandingLabel(undefined as never, "fr")).toBe(
      "En attente d'examen"
    );
    expect(sourceStandingLabel(undefined as never, "en")).toBe(
      "Awaiting review"
    );
  });
});

#!/usr/bin/env tsx
/**
 * Editorial CI rules gate for AFRIK fiches — ETNI-32.
 *
 * Enforces three decolonial-posture rules on every fiche under
 * `dataset/source/afrik/`:
 *
 *   Rule 1 — Endonym (autonym) required.
 *     If a fiche has no autonym (top-level `autonym`, or
 *     `content.appellations.selfAppellation` for PPL fiches, or
 *     `content.decolonialHeader.selfAppellation` for FLG fiches), then:
 *       - if `confidence` >= medium → error (blocks merge)
 *       - if `confidence` < medium or missing → warning (advisory)
 *
 *   Rule 2 — Sources count.
 *     If `classification_status` ∈ {contested, colonial-legacy} and the
 *     fiche carries fewer than 2 sources (aggregated `content.sources`),
 *     emit an error.
 *
 *   Rule 3 — DoctrineLinkCard snapshot presence.
 *     If `classification_status` ∈ {contested, colonial-legacy}, look for a
 *     test file in the repo referencing `DoctrineLinkCard`. If no such test
 *     exists anywhere (ETNI-28 not yet merged), emit a `notice` and DO NOT
 *     block the build.
 *
 * Output: PR-annotation lines printed to stdout for GitHub Actions to pick
 * up, plus a human-readable summary on stderr. Exit code 0 when no errors,
 * 1 otherwise.
 */

import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";

// ───── Types ──────────────────────────────────────────────────────────────

export type Severity = "error" | "warning" | "notice";

export type RuleName =
  | "autonym-required"
  | "sources-count"
  | "doctrine-link-card-snapshot"
  | "json-parse";

export interface RuleResult {
  rule: RuleName;
  severity: Severity;
  file: string; // path relative to repo root
  slug: string; // fiche id, e.g. PPL_YORUBA
  message: string;
}

export interface Fiche {
  id?: string;
  autonym?: string | null;
  confidence?: string | null;
  classification_status?: string | null;
  content?: {
    appellations?: { selfAppellation?: string | null };
    decolonialHeader?: { selfAppellation?: string | null };
    sources?: unknown[];
  };
  [key: string]: unknown;
}

export interface RunResult {
  exitCode: number;
  findings: RuleResult[];
  annotations: string[];
}

// ───── Helpers ────────────────────────────────────────────────────────────

const AUTONYM_RULE: RuleName = "autonym-required";
const SOURCES_RULE: RuleName = "sources-count";
const DOCTRINE_RULE: RuleName = "doctrine-link-card-snapshot";

const CONFIDENCE_BLOCKING = new Set(["medium", "high", "verified"]);
const CLASSIFICATION_FLAGGED = new Set(["contested", "colonial-legacy"]);

export function extractAutonym(fiche: Fiche): string | null {
  const top = fiche.autonym;
  if (typeof top === "string" && top.trim().length > 0) return top;

  const appellations = fiche.content?.appellations?.selfAppellation;
  if (typeof appellations === "string" && appellations.trim().length > 0) {
    return appellations;
  }

  const flg = fiche.content?.decolonialHeader?.selfAppellation;
  if (typeof flg === "string" && flg.trim().length > 0) return flg;

  return null;
}

/**
 * Country fiches (under `pays/`) don't carry a single autonym — they aggregate
 * many peoples, each with their own `selfAppellation`. The endonym rule (Rule
 * 1) only applies to ethnographic entities (peoples, language families).
 */
export function isCountryFiche(relPath: string): boolean {
  const parts = relPath.split(/[\\/]/);
  return parts.some((p) => p === "pays");
}

export function extractConfidence(fiche: Fiche): string | null {
  const c = fiche.confidence;
  return typeof c === "string" && c.length > 0 ? c.toLowerCase() : null;
}

export function extractClassificationStatus(fiche: Fiche): string | null {
  const s = fiche.classification_status;
  return typeof s === "string" && s.length > 0 ? s.toLowerCase() : null;
}

export function extractSources(fiche: Fiche): unknown[] {
  const sources = fiche.content?.sources;
  return Array.isArray(sources) ? sources : [];
}

function getSlug(fiche: Fiche, fallbackFromPath: string): string {
  if (typeof fiche.id === "string" && fiche.id.length > 0) return fiche.id;
  return path.basename(fallbackFromPath, ".json");
}

// ───── Rule 1: autonym ────────────────────────────────────────────────────

export function checkAutonym(fiche: Fiche, file: string): RuleResult | null {
  // Country fiches are exempt — they aggregate many peoples and have no
  // single autonym.
  if (isCountryFiche(file)) return null;

  const autonym = extractAutonym(fiche);
  if (autonym !== null) return null;

  const confidence = extractConfidence(fiche);
  const blocking = confidence !== null && CONFIDENCE_BLOCKING.has(confidence);
  const slug = getSlug(fiche, file);
  const severity: Severity = blocking ? "error" : "warning";
  const confidenceLabel = confidence ?? "missing";

  return {
    rule: AUTONYM_RULE,
    severity,
    file,
    slug,
    message: `Fiche ${slug} has no autonym (endonym). Confidence=${confidenceLabel}. Decolonial posture requires every fiche to provide its self-appellation before reaching confidence >= medium.`,
  };
}

// ───── Rule 2: sources count ──────────────────────────────────────────────

export function checkSourcesCount(
  fiche: Fiche,
  file: string
): RuleResult | null {
  const status = extractClassificationStatus(fiche);
  if (status === null || !CLASSIFICATION_FLAGGED.has(status)) return null;

  const count = extractSources(fiche).length;
  if (count >= 2) return null;

  const slug = getSlug(fiche, file);
  return {
    rule: SOURCES_RULE,
    severity: "error",
    file,
    slug,
    message: `Fiche ${slug} has classification_status="${status}" but only ${count} source(s). Decolonial posture requires >= 2 sources for contested or colonial-legacy classifications.`,
  };
}

// ───── Rule 3: DoctrineLinkCard snapshot ──────────────────────────────────

const TEST_DIR_NAMES = new Set(["__tests__", "__snapshots__", "tests", "test"]);
const TEST_FILE_RE = /\.(test|spec|stories)\.(ts|tsx|js|jsx|mdx)$/i;
const SNAPSHOT_FILE_RE = /\.snap$/i;

function isTestFile(name: string): boolean {
  return TEST_FILE_RE.test(name) || SNAPSHOT_FILE_RE.test(name);
}

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".vercel",
  ".storybook-static",
  "storybook-static",
]);

function searchForDoctrineLinkCardTest(root: string): boolean {
  // Walk repo, look for a test file mentioning DoctrineLinkCard.
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".github") {
        // Skip hidden dirs other than .github (not relevant for tests anyway).
        if (entry.isDirectory()) continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isTestFile(entry.name)) continue;
      let content: string;
      try {
        content = fs.readFileSync(full, "utf-8");
      } catch {
        continue;
      }
      if (content.includes("DoctrineLinkCard")) return true;
    }
  }
  return false;
}

// Cache to avoid walking the tree per-fiche. Keyed by repoRoot.
const doctrineSearchCache = new Map<string, boolean>();

export function checkDoctrineLinkCardSnapshot(
  fiche: Fiche,
  file: string,
  repoRoot: string
): RuleResult | null {
  const status = extractClassificationStatus(fiche);
  if (status === null || !CLASSIFICATION_FLAGGED.has(status)) return null;

  let exists = doctrineSearchCache.get(repoRoot);
  if (exists === undefined) {
    exists = searchForDoctrineLinkCardTest(repoRoot);
    doctrineSearchCache.set(repoRoot, exists);
  }

  if (exists) return null;

  const slug = getSlug(fiche, file);
  return {
    rule: DOCTRINE_RULE,
    severity: "notice",
    file,
    slug,
    message: `Fiche ${slug} has classification_status="${status}" but no DoctrineLinkCard test was found in the repository. ETNI-28 not yet merged — Rule 3 is informational only.`,
  };
}

// ───── Loader ─────────────────────────────────────────────────────────────

interface LoadedFiche {
  fiche: Fiche | null;
  relPath: string;
  parseError: string | null;
}

function listFicheFiles(afrikRoot: string): string[] {
  const out: string[] = [];
  const stack: string[] = [afrikRoot];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip `archive/` directories that are not part of live data.
        if (entry.name === "archive") continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".json")) continue;
      out.push(full);
    }
  }
  return out.sort();
}

function loadFiche(fullPath: string, repoRoot: string): LoadedFiche {
  const relPath = path.relative(repoRoot, fullPath);
  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    const fiche = JSON.parse(raw) as Fiche;
    return { fiche, relPath, parseError: null };
  } catch (err) {
    return {
      fiche: null,
      relPath,
      parseError: err instanceof Error ? err.message : String(err),
    };
  }
}

// ───── PR-annotation emitter ──────────────────────────────────────────────

export function formatAnnotation(r: RuleResult): string {
  const tag =
    r.severity === "error"
      ? "::error"
      : r.severity === "warning"
        ? "::warning"
        : "::notice";
  // Posix-style separator for GitHub Actions annotations.
  const file = r.file.split(path.sep).join("/");
  return `${tag} file=${file},title=${r.rule}::${r.slug} — ${r.message}`;
}

// ───── Runner ─────────────────────────────────────────────────────────────

export interface RunOptions {
  repoRoot: string;
  afrikRoot?: string;
}

export function runEditorialRules(opts: RunOptions): RunResult {
  const repoRoot = opts.repoRoot;
  const afrikRoot =
    opts.afrikRoot ?? path.join(repoRoot, "dataset", "source", "afrik");

  // Reset doctrine cache for this run (tests reuse the module).
  doctrineSearchCache.delete(repoRoot);

  const findings: RuleResult[] = [];

  if (!fs.existsSync(afrikRoot)) {
    // No data dir → nothing to do; emit a notice for transparency but exit 0.
    const notice: RuleResult = {
      rule: AUTONYM_RULE,
      severity: "notice",
      file: path.relative(repoRoot, afrikRoot),
      slug: "—",
      message: `AFRIK source directory not found at ${afrikRoot}; nothing to validate.`,
    };
    const annotations = [formatAnnotation(notice)];
    return { exitCode: 0, findings: [notice], annotations };
  }

  const files = listFicheFiles(afrikRoot);

  for (const fullPath of files) {
    const { fiche, relPath, parseError } = loadFiche(fullPath, repoRoot);
    if (parseError !== null || fiche === null) {
      findings.push({
        rule: "json-parse",
        severity: "error",
        file: relPath,
        slug: path.basename(relPath, ".json"),
        message: `Invalid JSON in ${relPath}: ${parseError}`,
      });
      continue;
    }

    const r1 = checkAutonym(fiche, relPath);
    if (r1) findings.push(r1);

    const r2 = checkSourcesCount(fiche, relPath);
    if (r2) findings.push(r2);

    const r3 = checkDoctrineLinkCardSnapshot(fiche, relPath, repoRoot);
    if (r3) findings.push(r3);
  }

  const annotations = findings.map(formatAnnotation);
  const exitCode = findings.some((f) => f.severity === "error") ? 1 : 0;
  return { exitCode, findings, annotations };
}

// ───── CLI entry point ────────────────────────────────────────────────────

function summarize(findings: RuleResult[]): string {
  const counts: Record<Severity, number> = {
    error: 0,
    warning: 0,
    notice: 0,
  };
  for (const f of findings) counts[f.severity]++;
  return `Editorial rules summary — errors: ${counts.error}, warnings: ${counts.warning}, notices: ${counts.notice}`;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const result = runEditorialRules({ repoRoot });
  for (const line of result.annotations) {
    // PR annotations must be written to stdout for GitHub Actions to pick
    // them up.
    process.stdout.write(line + "\n");
  }
  process.stderr.write(summarize(result.findings) + "\n");
  process.exit(result.exitCode);
}

// Only run main() when invoked directly (not when imported by tests).
const invokedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  void main();
}

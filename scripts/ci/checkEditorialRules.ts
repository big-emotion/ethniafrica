#!/usr/bin/env tsx
/**
 * Editorial CI rules gate for AFRIK fiches — ETNI-32.
 *
 * Enforces five decolonial-posture rules on the fiches under
 * `dataset/source/afrik/`:
 *
 *   Rule 1 — Endonym (autonym) required.
 *     Asked only of ethnographic entities — peoples and language families.
 *     The scope used to be "anything that is not a country", which was true
 *     while the corpus held three classes; it now holds eight, so that
 *     negative scope asked 24 language fiches and 32 patronyme files for a
 *     self-appellation none of them has a field to declare. Eighty-nine
 *     inapplicable warnings buried the two real ones — PPL_KIRDI among them,
 *     a colonial exonym meaning "pagan", which is precisely the case this
 *     rule exists to surface.
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
 *   Rule 4 — A patronyme's claims cite its own sources.
 *     Patronymes are the only corpus class where provenance attaches to the
 *     assertion rather than to the fiche: each claim names the `sourceKey`
 *     backing it, through `sourceRefs`. A reference to a key the dossier does
 *     not declare renders exactly like one that resolves, so the claim reads
 *     as sourced while citing nothing.
 *
 *   Rule 5 — Reader-facing register.
 *     `gaps[].reason`, `sources[].title` and `sources[].notes` are rendered to
 *     the visitor verbatim, so they may carry no repository path, no JSON field
 *     path, no raw corpus identifier and none of the pipeline's own vocabulary.
 *     See `docs/editorial/reader-facing-register.md`.
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
  | "source-ref-resolves"
  | "reader-facing-register"
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
  classificationStatus?: string | null;
  gaps?: unknown[];
  sources?: unknown[];
  names?: unknown[];
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
 * many peoples, each with their own `selfAppellation`.
 */
export function isCountryFiche(relPath: string): boolean {
  const parts = relPath.split(/[\\/]/);
  return parts.some((p) => p === "pays");
}

/** The classes the autonym rule is about. */
const ETHNOGRAPHIC_DIRS = new Set(["peuples", "famille_linguistique"]);

/**
 * Rule 1 asks a fiche for its self-appellation. Only an ethnographic entity
 * has one to give.
 *
 * The rule used to be scoped as "anything that is not a country", which was
 * true of the corpus when it held three classes. It now holds eight, so the
 * negative scope caught languages, patronymes, relations, migrations and
 * onomastic systems — 89 advisory warnings asking a language for an endonym
 * it has no field to declare. A gate whose output is mostly inapplicable is
 * one nobody reads, which is the failure this file's own header warns about
 * from the other direction.
 */
export function isEthnographicFiche(relPath: string): boolean {
  const parts = relPath.split(/[\\/]/);
  return parts.some((p) => ETHNOGRAPHIC_DIRS.has(p));
}

/** A `PAT_*` dossier, the one class whose provenance is per-claim. */
export function isPatronymeFiche(relPath: string): boolean {
  const parts = relPath.split(/[\\/]/);
  return (
    parts.some((p) => p === "patronymes") &&
    /^PAT_[A-Z0-9_]+\.json$/.test(parts[parts.length - 1] ?? "")
  );
}

export function extractConfidence(fiche: Fiche): string | null {
  const c = fiche.confidence;
  return typeof c === "string" && c.length > 0 ? c.toLowerCase() : null;
}

/**
 * Both spellings are read, and neither may be tidied away.
 *
 * PPL and FLG fiches declare `classificationStatus` at the top level: that is
 * what `migrateAfrikToDatabase.ts` loads into the column (`:204` for families,
 * `:244` for peoples), and what `validateAfrikData.ts` already validates on
 * migration, relation and nom fiches. Reading only `classification_status`
 * meant Rule 2 matched no fiche in the corpus and reported green for it — a
 * gate that checked nothing, which is worse than a red one.
 *
 * The snake_case form stays because migration fiches use it.
 */
export function extractClassificationStatus(fiche: Fiche): string | null {
  const s = fiche.classification_status ?? fiche.classificationStatus;
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
  // Asked of the entities that have a self-appellation to give, rather than
  // of everything that is not a country — see `isEthnographicFiche`.
  if (!isEthnographicFiche(file)) return null;

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

// ───── Rule 4: a patronyme's claims cite its own sources ──────────────────

const SOURCE_REF_RULE: RuleName = "source-ref-resolves";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every `sourceRefs` entry anywhere in a dossier, however deeply nested. */
function collectSourceRefs(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectSourceRefs(entry, into);
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (key === "sourceRefs" && Array.isArray(child)) {
      for (const ref of child) {
        if (typeof ref === "string" && ref.trim() !== "") into.add(ref);
      }
      continue;
    }
    if (key === "selfIdentificationSourceRef" && typeof child === "string") {
      into.add(child);
      continue;
    }
    collectSourceRefs(child, into);
  }
}

/**
 * Patronymes are the only corpus class where provenance attaches to the
 * assertion rather than to the fiche: each claim names the `sourceKey` that
 * backs it. A reference to a key the dossier does not declare is a claim that
 * cites nothing — and it renders exactly like one that cites something, which
 * is the failure mode a provenance-first surface can least afford.
 */
export function checkPatronymeSourceRefs(
  fiche: Fiche,
  file: string
): RuleResult[] {
  if (!isPatronymeFiche(file)) return [];

  const declared = new Set<string>();
  const sources = fiche.sources;
  if (Array.isArray(sources)) {
    for (const source of sources) {
      if (isRecord(source) && typeof source.sourceKey === "string") {
        declared.add(source.sourceKey);
      }
    }
  }

  const referenced = new Set<string>();
  collectSourceRefs(fiche, referenced);

  const slug = getSlug(fiche, file);
  return [...referenced]
    .filter((ref) => !declared.has(ref))
    .sort()
    .map((ref) => ({
      rule: SOURCE_REF_RULE,
      severity: "error" as Severity,
      file,
      slug,
      message: `Fiche ${slug} cites source key "${ref}", which it does not declare in sources[]. A claim referencing an undeclared key is published as sourced while resolving to nothing.`,
    }));
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

// ───── Rule 5: reader-facing register ─────────────────────────────────────

const REGISTER_RULE: RuleName = "reader-facing-register";

export interface ProseField {
  path: string;
  text: string;
}

/**
 * The prose a fiche publishes verbatim.
 *
 * `gaps[].reason` is rendered by `FieldProvenanceMarker` and the `sources[]`
 * entries by the Sources chapter, neither of which draws a curation/reader
 * distinction: whatever the corpus holds in these three fields is what the
 * visitor reads. Name fiches nest their sources one level deeper.
 *
 * Every other string in a fiche — `_meta.directives` included — is authoring
 * metadata that no surface renders, and stays the curator's to write.
 */
export function readerFacingProseFields(fiche: Fiche): ProseField[] {
  const fields: ProseField[] = [];

  const pushSources = (sources: unknown, prefix: string): void => {
    if (!Array.isArray(sources)) return;
    sources.forEach((source, i) => {
      if (!isRecord(source)) return;
      for (const key of ["title", "notes"] as const) {
        const value = source[key];
        if (typeof value === "string" && value.trim() !== "") {
          fields.push({ path: `${prefix}[${i}].${key}`, text: value });
        }
      }
    });
  };

  if (Array.isArray(fiche.gaps)) {
    fiche.gaps.forEach((gap, i) => {
      if (!isRecord(gap)) return;
      const reason = gap.reason;
      if (typeof reason === "string" && reason.trim() !== "") {
        fields.push({ path: `gaps[${i}].reason`, text: reason });
      }
    });
  }

  pushSources(fiche.sources, "sources");

  if (Array.isArray(fiche.names)) {
    fiche.names.forEach((entry, i) => {
      if (!isRecord(entry)) return;
      pushSources(entry.sources, `names[${i}].sources`);
    });
  }

  return fields;
}

/**
 * What marks a sentence as written for the curator rather than for the reader.
 *
 * Three kinds, and the third is the one worth naming. A repository path or a
 * raw `PPL_`/`FLG_`/`PAT_` identifier is obvious once seen. The pipeline's own
 * vocabulary is not: "la file d'attente des candidats", "le protocole de
 * recherche par fiche", "la revue claim-level reste requise" all read as
 * ordinary French, so they survived every review — while telling the visitor
 * about a work queue, a research backlog and an unresolved tier that describe
 * how the atlas is made, not what it knows.
 *
 * The reader is owed the silence itself ("l'atlas ne documente pas encore ce
 * point"), never the reason the workshop has not filled it yet.
 */
export const INTERNAL_REGISTER_PATTERNS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: "repository path",
    pattern: /\b(?:dataset|docs|scripts|src|public)\/[\w./-]+/,
  },
  { label: "file name", pattern: /\b[\w-]+\.json\b/ },
  {
    label: "JSON field path",
    pattern:
      /\b(?:content|_meta)\.\w+|\bfieldPath\b|\bsourceRefs\b|\bsourceKey\b|\bverificationLead\b|\btargetPatronymeId\b|\bclassificationStatus\b/,
  },
  {
    // The wildcard form matters as much as a full id: 468 alliance gap
    // reasons told the reader no pact was found "avec une autre fiche
    // PAT_* existante", and `PAT_*` is not a word any reader has.
    label: "raw corpus identifier",
    pattern: /\b(?:PPL|FLG|PAT)_(?:[A-Z0-9_]+|\*)/,
  },
  {
    label: "curation vocabulary",
    pattern:
      /file d'attente|passe de recherche|passe anthroponymique|protocole de recherche|claim-level|tier hérité|hors corpus|plan de couverture|vague \d+ du plan/i,
  },
  { label: "internal corpus label", pattern: /Corpus AFRIK\s*—/i },
];

/**
 * `_`-prefixed files under the corpus are the curator's own worksheets — the
 * candidate queue, the coverage findings, the manifest. Nothing loads them and
 * no surface renders them, so their notes are allowed to stay notes.
 */
export function isCuratorWorksheet(relPath: string): boolean {
  return path.basename(relPath).startsWith("_");
}

export function checkReaderFacingRegister(
  fiche: Fiche,
  file: string
): RuleResult[] {
  if (isCuratorWorksheet(file)) return [];

  const slug = getSlug(fiche, file);
  const findings: RuleResult[] = [];

  for (const field of readerFacingProseFields(fiche)) {
    for (const { label, pattern } of INTERNAL_REGISTER_PATTERNS) {
      const hit = field.text.match(pattern);
      if (hit === null) continue;
      findings.push({
        rule: REGISTER_RULE,
        severity: "error",
        file,
        slug,
        message: `${field.path} is published verbatim to the reader but carries a ${label} ("${hit[0]}"). Say what the atlas does not know; never how the workshop knows it does not.`,
      });
      break;
    }
  }

  return findings;
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
        // Skip directories that are not live corpus data: `archive/` is
        // retired fiches, and `logs/` is where validateAfrikData writes its
        // own report — walking it made the gate audit its own output.
        if (entry.name === "archive" || entry.name === "logs") continue;
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

/**
 * Escape characters that have special meaning in GitHub Actions workflow
 * commands. The `%` substitution MUST run first to avoid double-escaping.
 * See https://docs.github.com/actions/reference/workflow-commands-for-github-actions
 */
export function escapeWorkflowCommand(s: string): string {
  return s
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

export function formatAnnotation(r: RuleResult): string {
  const tag =
    r.severity === "error"
      ? "::error"
      : r.severity === "warning"
        ? "::warning"
        : "::notice";
  // Posix-style separator for GitHub Actions annotations.
  const file = r.file.split(path.sep).join("/");
  const title = escapeWorkflowCommand(`${r.rule}::${r.slug}`);
  const message = escapeWorkflowCommand(`${r.slug} — ${r.message}`);
  return `${tag} file=${file},title=${title}::${message}`;
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

    findings.push(...checkPatronymeSourceRefs(fiche, relPath));

    findings.push(...checkReaderFacingRegister(fiche, relPath));
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
  // Ensure stdout is flushed before exit; process.exit() can otherwise drop
  // buffered annotation lines and break GitHub Actions parsing.
  await new Promise<void>((resolve) =>
    process.stdout.write("", () => resolve())
  );
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

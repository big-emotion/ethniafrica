#!/usr/bin/env tsx
/**
 * Glossary gate (REQ-144): translated content uses the one bilingual glossary.
 *
 * Reads `GLOSSARY_TERMS` (src/lib/glossaire/terms.ts) and walks two surfaces:
 *
 *   1. the translated corpus records under `dataset/translations/en/`, every
 *      string leaf, named by record id and JSON path;
 *   2. the English side of each UI dictionary listed in `UI_DICTIONARIES`,
 *      every string leaf, named by dotted key.
 *
 * Two rules, both deliberately narrow — a gate on terms, not a spell-checker
 * on prose, because a gate that fires on every sentence gets switched off:
 *
 *   - `glossary-forbidden-rendering`: a term's `forbiddenEn` word stands in
 *     the English (a people written as a tribe);
 *   - `glossary-untranslated-term`: a term's French form survives in the
 *     English, for terms whose two forms differ (« famille linguistique »).
 *
 * A quoted mention (« … », “ … ”, " … ", ' … ') is exempt: the fiche has to
 * be able to name the word it retires. So are the three fields where a
 * retired word is legitimately discussed — `whyProblematic`,
 * `originOfExonyms`, `contemporaryUsage` — and whatever no reader sees:
 * `_meta`, identifiers, URLs.
 *
 * Zero translated records exist on the day this ships; the gate passes on an
 * empty set and says so. `runGlossaryGate` is exported so the translation
 * parity gate can ride on it later.
 *
 * Exit code 1 on any error. GitHub `::error` annotations on stdout.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { GLOSSARY_TERMS, type GlossaryTerm } from "@/lib/glossaire/terms";
import { translations } from "@/lib/translations";
import { escapeWorkflowCommand } from "./checkEditorialRules";

// ───── Types ──────────────────────────────────────────────────────────────

export type GlossaryRuleName =
  "glossary-forbidden-rendering" | "glossary-untranslated-term" | "json-parse";

export interface GlossaryFinding {
  rule: GlossaryRuleName;
  severity: "error";
  /** Repo-relative path of the file that carries the string. */
  file: string;
  /** The record id (`PPL_YORUBA`) or the dictionary name. */
  record: string;
  /** JSON path inside the record, or dotted key inside the dictionary. */
  path: string;
  termKey: string;
  rendered: string;
  expected: string;
  message: string;
}

/** Where a string came from, for the finding that names it. */
export interface TextLocation {
  file: string;
  record: string;
  path: string;
}

export interface UiDictionary {
  /** Repo-relative path, used as the annotation's `file`. */
  name: string;
  /** The dictionary object itself, keyed by locale at the top level. */
  dictionary: Record<string, unknown>;
}

export interface RunOptions {
  repoRoot: string;
  /** Defaults to `<repoRoot>/dataset/translations/en`. */
  translationsRoot?: string;
  /** Defaults to `UI_DICTIONARIES`. */
  uiDictionaries?: readonly UiDictionary[];
}

export interface RunResult {
  exitCode: 0 | 1;
  findings: GlossaryFinding[];
  annotations: string[];
}

// ───── What is scanned ────────────────────────────────────────────────────

/**
 * The UI dictionaries whose English side the gate reads. `translations`
 * carries both locales, so the gate scans its `en` side on every run.
 */
export const UI_DICTIONARIES: readonly UiDictionary[] = [
  {
    name: "src/lib/translations.ts",
    dictionary: translations,
  },
];

/**
 * ETNI-1827's class 3: the fields where an exonym is discussed rather than
 * used — why it is problematic, where it came from, how it is used today.
 * A retired word in one of them is the doctrine at work.
 */
const DISCUSSION_FIELDS = new Set([
  "whyProblematic",
  "originOfExonyms",
  "contemporaryUsage",
]);

/** Keys no reader sees: authoring metadata, identifiers, references. */
const UNRENDERED_KEYS = new Set([
  "_meta",
  "id",
  "sourceKey",
  "sourceRefs",
  "fieldPath",
]);
const IDENTIFIER_KEY = /(?:^|[a-z])Ids?$/;
const URL_VALUE = /^https?:\/\//i;

// ───── Rules ──────────────────────────────────────────────────────────────

const QUOTED_SPANS = [
  /«[^»]*»/g,
  /“[^”]*”/g,
  /"[^"]*"/g,
  // An apostrophe inside a word is possession, not quotation: the span has to
  // open and close at word edges.
  /(?<![\p{L}\p{N}])'[^']*'(?![\p{L}\p{N}])/gu,
];

function quotedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const pattern of QUOTED_SPANS) {
    for (const match of text.matchAll(pattern)) {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  return ranges;
}

function isQuoted(ranges: Array<[number, number]>, index: number): boolean {
  return ranges.some(([start, end]) => index > start && index < end);
}

function escapeRegExp(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// `\b` is ASCII-only in JavaScript, so a boundary before « Émique » or after
// « vérifiée » would never match. Unicode letter classes stand in for it.
function wholeWord(phrase: string, plural = false): RegExp {
  const tail = plural ? "s?" : "";
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}${tail}(?![\\p{L}\\p{N}])`,
    "giu"
  );
}

interface Rule {
  name: GlossaryRuleName;
  term: GlossaryTerm;
  pattern: RegExp;
  expected: string;
}

/**
 * An entry may gloss its English with a parenthetical — « Jamu (Mande clan
 * name) » — and then the word itself is the same in both languages: there
 * is nothing to translate and nothing to report.
 */
function bareEnglish(term: GlossaryTerm): string {
  return term.en.replace(/\s*\([^)]*\)\s*$/, "").toLowerCase();
}

function compileRules(terms: readonly GlossaryTerm[]): Rule[] {
  const rules: Rule[] = [];
  for (const term of terms) {
    for (const word of term.forbiddenEn ?? []) {
      rules.push({
        name: "glossary-forbidden-rendering",
        term,
        pattern: wholeWord(word),
        expected: term.en,
      });
    }
    if (term.fr.toLowerCase() !== bareEnglish(term)) {
      rules.push({
        name: "glossary-untranslated-term",
        term,
        pattern: wholeWord(term.fr, true),
        expected: term.en,
      });
    }
  }
  return rules;
}

const RULES = compileRules(GLOSSARY_TERMS);

interface Hit {
  rule: Rule;
  start: number;
  end: number;
  rendered: string;
}

/**
 * A shorter term inside a longer match is the longer term's business:
 * « famille linguistique » must not also report « linguistique ».
 */
function longestOnly(hits: Hit[]): Hit[] {
  return hits.filter(
    (hit) =>
      !hits.some(
        (other) =>
          other !== hit &&
          other.start <= hit.start &&
          other.end >= hit.end &&
          other.end - other.start > hit.end - hit.start
      )
  );
}

/**
 * The two rules on one string. Pure: the caller says where the string came
 * from and this names the breach.
 */
export function checkTranslatedText(
  text: string,
  location: TextLocation
): GlossaryFinding[] {
  const ranges = quotedRanges(text);
  const hits: Hit[] = [];

  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      if (isQuoted(ranges, match.index)) continue;
      hits.push({
        rule,
        start: match.index,
        end: match.index + match[0].length,
        rendered: match[0].toLowerCase(),
      });
    }
  }

  const findings: GlossaryFinding[] = [];
  const seen = new Set<string>();
  for (const hit of longestOnly(hits)) {
    const { rule, rendered } = hit;
    const dedupeKey = `${rule.name}:${rule.term.key}:${rendered}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const verb =
      rule.name === "glossary-forbidden-rendering"
        ? "is a forbidden rendering of"
        : "is the untranslated French of";
    findings.push({
      rule: rule.name,
      severity: "error",
      file: location.file,
      record: location.record,
      path: location.path,
      termKey: rule.term.key,
      rendered,
      expected: rule.expected,
      message: `${location.path}: "${rendered}" ${verb} ${rule.term.key}; the glossary says "${rule.expected}"`,
    });
  }
  return findings;
}

// ───── Walking a record ───────────────────────────────────────────────────

function walkStrings(
  value: unknown,
  jsonPath: string,
  key: string,
  visit: (text: string, jsonPath: string) => void
): void {
  if (UNRENDERED_KEYS.has(key) || IDENTIFIER_KEY.test(key)) return;
  if (DISCUSSION_FIELDS.has(key)) return;

  if (typeof value === "string") {
    if (URL_VALUE.test(value)) return;
    visit(value, jsonPath);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkStrings(item, `${jsonPath}[${index}]`, key, visit)
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) {
      const childPath = jsonPath ? `${jsonPath}.${childKey}` : childKey;
      walkStrings(child, childPath, childKey, visit);
    }
  }
}

function recordIdOf(record: unknown, file: string): string {
  const declared =
    record && typeof record === "object" && "id" in record
      ? (record as { id?: unknown }).id
      : undefined;
  return typeof declared === "string" && declared !== ""
    ? declared
    : path.basename(file, ".json");
}

/** Every string leaf of one translated record, through the two rules. */
export function checkTranslatedRecord(
  record: unknown,
  file: string
): GlossaryFinding[] {
  const recordId = recordIdOf(record, file);
  const findings: GlossaryFinding[] = [];
  walkStrings(record, "", "", (text, jsonPath) => {
    findings.push(
      ...checkTranslatedText(text, { file, record: recordId, path: jsonPath })
    );
  });
  return findings;
}

// ───── Walking the two surfaces ───────────────────────────────────────────

function listTranslatedRecords(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function toPosix(relPath: string): string {
  return relPath.split(path.sep).join("/");
}

function checkUiDictionary(source: UiDictionary): {
  findings: GlossaryFinding[];
  englishSide: boolean;
} {
  if (!("en" in source.dictionary)) {
    return { findings: [], englishSide: false };
  }
  const findings: GlossaryFinding[] = [];
  walkStrings(source.dictionary.en, "en", "en", (text, dottedKey) => {
    findings.push(
      ...checkTranslatedText(text, {
        file: source.name,
        record: source.name,
        path: dottedKey,
      })
    );
  });
  return { findings, englishSide: true };
}

// ───── Annotations ────────────────────────────────────────────────────────

function formatFinding(finding: GlossaryFinding): string {
  const title = escapeWorkflowCommand(finding.rule);
  const message = escapeWorkflowCommand(
    `${finding.record} — ${finding.message}`
  );
  return `::error file=${toPosix(finding.file)},title=${title}::${message}`;
}

function formatNotice(message: string): string {
  return `::notice title=glossary-gate::${escapeWorkflowCommand(message)}`;
}

// ───── Runner ─────────────────────────────────────────────────────────────

export function runGlossaryGate(opts: RunOptions): RunResult {
  const repoRoot = opts.repoRoot;
  const translationsRoot =
    opts.translationsRoot ??
    path.join(repoRoot, "dataset", "translations", "en");
  const uiDictionaries = opts.uiDictionaries ?? UI_DICTIONARIES;

  const findings: GlossaryFinding[] = [];
  const annotations: string[] = [];

  const files = listTranslatedRecords(translationsRoot);
  for (const fullPath of files) {
    const relPath = toPosix(path.relative(repoRoot, fullPath));
    let record: unknown;
    try {
      record = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch (err) {
      findings.push({
        rule: "json-parse",
        severity: "error",
        file: relPath,
        record: path.basename(relPath, ".json"),
        path: "",
        termKey: "",
        rendered: "",
        expected: "",
        message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }
    findings.push(...checkTranslatedRecord(record, relPath));
  }
  annotations.push(
    formatNotice(
      `${files.length} translated records scanned under ${toPosix(
        path.relative(repoRoot, translationsRoot)
      )}`
    )
  );

  for (const source of uiDictionaries) {
    const { findings: dictionaryFindings, englishSide } =
      checkUiDictionary(source);
    if (!englishSide) {
      annotations.push(
        formatNotice(
          `${source.name} has no "en" side yet; the UI dictionary pass is skipped`
        )
      );
      continue;
    }
    findings.push(...dictionaryFindings);
  }

  annotations.push(...findings.map(formatFinding));
  return {
    exitCode: findings.length > 0 ? 1 : 0,
    findings,
    annotations,
  };
}

// ───── CLI entry point ────────────────────────────────────────────────────

async function main(): Promise<void> {
  const result = runGlossaryGate({ repoRoot: process.cwd() });
  for (const line of result.annotations) {
    // Annotations go to stdout: that is where GitHub Actions reads them.
    process.stdout.write(line + "\n");
  }
  process.stderr.write(
    `Glossary gate — ${result.findings.length} divergence(s) from ${GLOSSARY_TERMS.length} terms\n`
  );
  // Flush before exit; process.exit() can drop buffered stdout lines.
  await new Promise<void>((resolve) =>
    process.stdout.write("", () => resolve())
  );
  process.exit(result.exitCode);
}

const invokedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  void main();
}

#!/usr/bin/env tsx
/**
 * Copy-literal guard (REQ-145): new reader-facing French goes in a dictionary.
 *
 * The site publishes two locales, and UI copy lives in the per-surface
 * dictionaries under `src/lib/i18n/copy/`, where the parity suite holds `en`
 * and `fr` to the same keys. A French string typed straight into a component
 * escapes that suite: it renders in French under `/en` and nothing turns red.
 * This gate is what turns it red.
 *
 * It reads the abstract syntax tree, not the text, so a comment can quote the
 * label it explains and a JSX comment can too. It flags a string literal, a
 * template literal part or a JSX text node carrying a French accented
 * character — narrow on purpose: a rule that fired on « Fermer » would also
 * fire on « Contact », and a gate with false positives gets switched off.
 *
 * Diff-scoped, the way `scripts/lintReqAnnotations.ts` is: `--staged` for the
 * pre-commit hook, `--base <ref>` for CI, and only the literals the change
 * *adds* are reported — a literal already present in the previous version of
 * the file is grandfathered, so a file holding two hundred French strings can
 * still be edited, and a wave can migrate a directory one string at a time.
 * A bare run (or `--all`) surveys the whole tree and exits 0: that is the
 * backlog the waves burn down, not a failure.
 *
 * Exempt: the dictionaries themselves, tests, stories, fixtures, the
 * test helpers, the code-authored prose banks (facts, dossiers, legal pages,
 * games, glossary, doctrine, mail) whose migration is its own wave, and the
 * generated atlas assets. One exported list, so an exemption is a visible
 * line here and never a flag somewhere else.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

import { escapeWorkflowCommand } from "./checkEditorialRules";

export interface CopyLiteralFinding {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface GuardMode {
  /** Ref the change is measured against; undefined means survey the tree. */
  diffBase: string | undefined;
  survey: boolean;
}

/**
 * The letters French writes with a diacritic or a ligature. Enough to catch
 * any sentence and most labels; an unaccented French word is left to review,
 * which is the trade the doc block above explains.
 */
export const FRENCH_ACCENT_PATTERN = /[àâäæçéèêëîïôöœùûüÿÀÂÄÆÇÉÈÊËÎÏÔÖŒÙÛÜŸ]/;

export const COPY_LITERAL_EXEMPT_PATTERNS: readonly RegExp[] = [
  // Where the French is supposed to be.
  /^src\/lib\/i18n\/copy\//,
  /^src\/lib\/translations\.ts$/,
  // What asserts or stages it.
  /(^|\/)__tests__\//,
  /(^|\/)__fixtures__\//,
  /\.(?:test|spec|stories)\.tsx?$/,
  /^src\/test\//,
  /^src\/stories\//,
  // Code-authored prose banks: editorial, migrated by their own wave.
  /^src\/lib\/home\//,
  /^src\/lib\/dossiers\//,
  /^src\/lib\/legal-pages[^/]*\.ts$/,
  /^src\/lib\/games\//,
  /^src\/lib\/glossaire\//,
  /^src\/lib\/doctrine\//,
  /^src\/lib\/email\//,
  // Generated from Natural Earth; carries `nameFr` by design.
  /^src\/lib\/atlas\/assets\//,
];

const SOURCE_FILE_PATTERN = /\.tsx?$/;
const SKIP_DIRECTORIES = new Set([".git", ".next", ".claude", "node_modules"]);

// @req REQ-145
export function isGuardedPath(filePath: string): boolean {
  if (!filePath.startsWith("src/")) return false;
  if (!SOURCE_FILE_PATTERN.test(filePath) || filePath.endsWith(".d.ts"))
    return false;
  return !COPY_LITERAL_EXEMPT_PATTERNS.some((pattern) =>
    pattern.test(filePath)
  );
}

function parseSource(content: string, filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

const EXCERPT_LENGTH = 60;

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > EXCERPT_LENGTH
    ? `${flat.slice(0, EXCERPT_LENGTH - 1)}…`
    : flat;
}

/**
 * The literal nodes a reader could see: string literals (JSX attributes
 * included), the text parts of template literals, and JSX text. Comments are
 * trivia and never reach the visitor.
 */
function isReaderFacingLiteral(
  node: ts.Node
): node is
  | ts.StringLiteral
  | ts.NoSubstitutionTemplateLiteral
  | ts.TemplateHead
  | ts.TemplateMiddle
  | ts.TemplateTail
  | ts.JsxText {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node) ||
    ts.isJsxText(node)
  );
}

// @req REQ-145
export function findCopyLiterals(
  content: string,
  filePath: string
): CopyLiteralFinding[] {
  const sourceFile = parseSource(content, filePath);
  const findings: CopyLiteralFinding[] = [];

  function visit(node: ts.Node): void {
    if (isReaderFacingLiteral(node) && FRENCH_ACCENT_PATTERN.test(node.text)) {
      const position = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );
      findings.push({
        path: filePath,
        line: position.line + 1,
        column: position.character + 1,
        text: excerpt(node.text),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

/**
 * The findings a change introduced: every literal in the file when the file
 * is new, and otherwise only those whose text the previous version did not
 * already carry. Keyed by text rather than by position, so reformatting or
 * moving an existing label is not a new label.
 */
// @req REQ-145
export function checkCopyLiterals(
  content: string,
  filePath: string,
  previousContent: string | undefined
): CopyLiteralFinding[] {
  const findings = findCopyLiterals(content, filePath);
  if (previousContent === undefined) return findings;
  const grandfathered = new Set(
    findCopyLiterals(previousContent, filePath).map((finding) => finding.text)
  );
  return findings.filter((finding) => !grandfathered.has(finding.text));
}

// @req REQ-145
export function resolveGuardMode(argv: string[]): GuardMode {
  const baseIndex = argv.indexOf("--base");
  if (baseIndex !== -1 && !argv[baseIndex + 1]) {
    throw new Error("--base requires a git ref (e.g. --base origin/recette)");
  }
  const diffBase = argv.includes("--staged")
    ? "HEAD"
    : baseIndex !== -1
      ? argv[baseIndex + 1]
      : undefined;
  return { diffBase, survey: diffBase === undefined };
}

function walkFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      files.push(...walkFiles(absolute));
    } else if (SOURCE_FILE_PATTERN.test(entry)) {
      files.push(absolute);
    }
  }
  return files;
}

/**
 * Three dots against a base: the PR is judged on what it introduces, not on
 * what landed on the base meanwhile. A git failure throws rather than
 * yielding an empty list — an empty diff that came from a broken command
 * would otherwise read as a clean one.
 */
function changedPaths(root: string, diffBase: string): string[] {
  const args =
    diffBase === "HEAD"
      ? ["diff", "--cached", "--name-only", "--diff-filter=AM"]
      : ["diff", "--name-only", "--diff-filter=AM", `${diffBase}...HEAD`];
  return execFileSync("git", args, { cwd: root, encoding: "utf8" })
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

function contentAtRef(
  root: string,
  ref: string,
  filePath: string
): string | undefined {
  try {
    return execFileSync("git", ["show", `${ref}:${filePath}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

const GUIDANCE =
  "reader-facing copy belongs in a src/lib/i18n/copy/<surface>.ts dictionary (docs/editorial/ui-copy.md)";

function report(finding: CopyLiteralFinding): void {
  const location = `${finding.path}:${finding.line}:${finding.column}`;
  const message = `French copy literal "${finding.text}" — ${GUIDANCE}`;
  console.error(`${location}: ${message}`);
  // The annotation form the other CI gates emit; harmless in a terminal.
  console.log(
    `::error file=${finding.path},line=${finding.line},col=${finding.column}::${escapeWorkflowCommand(message)}`
  );
}

function survey(root: string): void {
  const counts = new Map<string, number>();
  for (const absolute of walkFiles(path.join(root, "src"))) {
    const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
    if (!isGuardedPath(relative)) continue;
    const found = findCopyLiterals(readFileSync(absolute, "utf8"), relative);
    if (found.length > 0) counts.set(relative, found.length);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  for (const [file, count] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(count).padStart(5)}  ${file}`);
  }
  console.log(
    `check:copy-literals — survey: ${total} French literal(s) in ${counts.size} file(s); not blocking (backlog for the migration waves)`
  );
}

function runCli(): void {
  const root = path.resolve(import.meta.dirname, "../..");
  const mode = resolveGuardMode(process.argv.slice(2));

  if (mode.survey || mode.diffBase === undefined) {
    survey(root);
    return;
  }

  const files = changedPaths(root, mode.diffBase).filter(
    (filePath) =>
      isGuardedPath(filePath) && existsSync(path.join(root, filePath))
  );
  const findings = files.flatMap((filePath) =>
    checkCopyLiterals(
      readFileSync(path.join(root, filePath), "utf8"),
      filePath,
      contentAtRef(root, mode.diffBase as string, filePath)
    )
  );

  for (const finding of findings) report(finding);

  if (findings.length > 0) {
    console.error(
      `check:copy-literals — ${findings.length} new French literal(s) in ${files.length} changed file(s)`
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `check:copy-literals — OK (${files.length} changed file(s) scanned)`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runCli();
}

#!/usr/bin/env tsx

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export interface CheckResult {
  errors: string[];
  warnings: string[];
}

export interface SourceFileInput {
  path: string;
  content: string;
}

export interface RequirementCatalog {
  requirements: string[];
}

const REQUIREMENT_ANNOTATION_PATTERN = /(?<!["'])\/\/\s*@req\s+(REQ-\d{3})\b/g;
const TEST_FILE_PATTERN = /\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs)$/;
const SOURCE_FILE_PATTERN = /\.(?:ts|tsx|js|jsx|mjs)$/;
const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".claude",
  "bootstrap",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "storybook-static",
  "test-results",
]);

function scriptKindFor(filePath: string): ts.ScriptKind {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs"))
    return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function parseSource(content: string, filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(filePath)
  );
}

function rootIdentifierName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression))
    return rootIdentifierName(expression.expression);
  if (ts.isCallExpression(expression))
    return rootIdentifierName(expression.expression);
  return null;
}

function isStringName(node: ts.Expression | undefined): boolean {
  return Boolean(
    node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  );
}

function isTestDefinition(node: ts.CallExpression): boolean {
  if (!isStringName(node.arguments[0])) return false;
  const root = rootIdentifierName(node.expression);
  return root === "test" || root === "it";
}

function requirementInRange(
  lines: string[],
  startLine: number,
  endLine: number
): boolean {
  const from = Math.max(0, startLine - 3);
  for (let index = from; index <= endLine; index += 1) {
    REQUIREMENT_ANNOTATION_PATTERN.lastIndex = 0;
    if (REQUIREMENT_ANNOTATION_PATTERN.test(lines[index] ?? "")) return true;
  }
  return false;
}

function testNames(content: string, filePath: string): Set<string> {
  const sourceFile = parseSource(content, filePath);
  const names = new Set<string>();

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && isTestDefinition(node)) {
      const argument = node.arguments[0];
      if (
        ts.isStringLiteral(argument) ||
        ts.isNoSubstitutionTemplateLiteral(argument)
      ) {
        names.add(argument.text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return names;
}

export function checkTestAnnotations(
  content: string,
  filePath: string,
  previousContent?: string
): CheckResult {
  const sourceFile = parseSource(content, filePath);
  const lines = content.split("\n");
  const errors: string[] = [];
  const grandfatheredNames = previousContent
    ? testNames(previousContent, filePath)
    : new Set<string>();

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && isTestDefinition(node)) {
      const argument = node.arguments[0];
      const name =
        ts.isStringLiteral(argument) ||
        ts.isNoSubstitutionTemplateLiteral(argument)
          ? argument.text
          : "";
      if (grandfatheredNames.has(name)) {
        ts.forEachChild(node, visit);
        return;
      }
      const start = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      if (!requirementInRange(lines, start.line, end.line)) {
        errors.push(
          `${filePath}:${start.line + 1}:1: missing @req annotation — add // @req REQ-NNN within 3 lines above this test/it call`
        );
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { errors, warnings: [] };
}

export function requirementAnnotations(content: string): Set<string> {
  const identifiers = new Set<string>();
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.JSX,
    content
  );
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia) {
      const match = /\/\/\s*@req\s+(REQ-\d{3})\b/.exec(scanner.getTokenText());
      if (match) identifiers.add(match[1]);
    }
    token = scanner.scan();
  }
  return identifiers;
}

function hasExportModifier(node: ts.Node): boolean {
  return Boolean(
    ts.canHaveModifiers(node) &&
    ts
      .getModifiers(node)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

interface ExportedSymbol {
  line: number;
  name: string;
  requirementId: string | null;
}

function exportedSymbols(content: string, filePath: string): ExportedSymbol[] {
  const sourceFile = parseSource(content, filePath);
  const symbols: ExportedSymbol[] = [];

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    const leading = content.slice(
      statement.getFullStart(),
      statement.getStart(sourceFile)
    );
    const requirementMatch = /@req\s+(REQ-\d{3})\b/.exec(leading);
    const requirement = requirementMatch?.[1] ?? null;
    const exportLine =
      sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile))
        .line + 1;
    const annotationLine = requirementMatch
      ? sourceFile.getLineAndCharacterOfPosition(
          statement.getFullStart() + requirementMatch.index
        ).line + 1
      : exportLine;
    const line = requirement ? annotationLine : exportLine;

    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      symbols.push({
        line,
        name: statement.name.text,
        requirementId: requirement,
      });
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          symbols.push({
            line,
            name: declaration.name.text,
            requirementId: requirement,
          });
        }
      }
    }
  }

  return symbols;
}

export function checkExportTraceability(files: SourceFileInput[]): CheckResult {
  const testedRequirements = new Set<string>();
  for (const file of files) {
    if (!TEST_FILE_PATTERN.test(file.path)) continue;
    for (const identifier of requirementAnnotations(file.content)) {
      testedRequirements.add(identifier);
    }
  }

  const errors: string[] = [];
  for (const file of files) {
    if (!file.path.startsWith("src/") || !SOURCE_FILE_PATTERN.test(file.path))
      continue;
    for (const symbol of exportedSymbols(file.content, file.path)) {
      if (
        symbol.requirementId &&
        !testedRequirements.has(symbol.requirementId)
      ) {
        errors.push(
          `${file.path}:${symbol.line}:1: exported symbol annotated @req ${symbol.requirementId} has no corresponding test annotation`
        );
      }
    }
  }

  return { errors, warnings: [] };
}

export function checkNewExports(
  content: string,
  filePath: string
): CheckResult {
  const warnings = exportedSymbols(content, filePath)
    .filter((symbol) => !symbol.requirementId)
    .map(
      (symbol) =>
        `${filePath}:${symbol.line}:1: new export "${symbol.name}" lacks @req annotation`
    );
  return { errors: [], warnings };
}

export function checkCatalog(
  content: string,
  filePath: string,
  catalog: RequirementCatalog | null
): CheckResult {
  if (!catalog) return { errors: [], warnings: [] };
  const known = new Set(catalog.requirements);
  const errors: string[] = [];
  const lines = content.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    let match: RegExpExecArray | null;
    REQUIREMENT_ANNOTATION_PATTERN.lastIndex = 0;
    while ((match = REQUIREMENT_ANNOTATION_PATTERN.exec(line))) {
      if (!known.has(match[1])) {
        errors.push(
          `${filePath}:${lineIndex + 1}:${match.index + match[0].indexOf(match[1]) + 1}: REQ-NNN "${match[1]}" is not registered in docs/confluence-spec/req-catalog.json`
        );
      }
    }
  }

  return { errors, warnings: [] };
}

function walkFiles(root: string, directory = root): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const absolute = path.join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...walkFiles(root, absolute));
    } else if (SOURCE_FILE_PATTERN.test(entry) && !entry.endsWith(".d.ts")) {
      files.push(absolute);
    }
  }
  return files;
}

function stagedPaths(root: string): string[] {
  try {
    return execFileSync(
      "git",
      ["diff", "--cached", "--name-only", "--diff-filter=AM"],
      {
        cwd: root,
        encoding: "utf8",
      }
    )
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function collectFiles(root: string, staged: boolean): SourceFileInput[] {
  const absolutePaths = staged
    ? stagedPaths(root)
        .filter((filePath) => SOURCE_FILE_PATTERN.test(filePath))
        .map((filePath) => path.join(root, filePath))
        .filter(existsSync)
    : walkFiles(root);

  return absolutePaths.map((absolute) => ({
    path: path.relative(root, absolute).replaceAll(path.sep, "/"),
    content: readFileSync(absolute, "utf8"),
  }));
}

function contentAtHead(root: string, filePath: string): string | undefined {
  try {
    return execFileSync("git", ["show", `HEAD:${filePath}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

function loadCatalog(root: string): RequirementCatalog | null {
  const catalogPath = path.join(root, "docs/confluence-spec/req-catalog.json");
  if (!existsSync(catalogPath)) return null;
  return JSON.parse(readFileSync(catalogPath, "utf8")) as RequirementCatalog;
}

function runCli(): void {
  const root = path.resolve(import.meta.dirname, "..");
  const staged = process.argv.includes("--staged");
  const strictTests = process.argv.includes("--strict-tests") || staged;
  const files = collectFiles(root, staged);
  const catalog = loadCatalog(root);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (strictTests) {
    for (const file of files.filter((candidate) =>
      TEST_FILE_PATTERN.test(candidate.path)
    )) {
      errors.push(
        ...checkTestAnnotations(
          file.content,
          file.path,
          staged ? contentAtHead(root, file.path) : undefined
        ).errors
      );
    }
  }

  const traceabilityFiles = staged
    ? [
        ...files,
        ...collectFiles(root, false).filter((file) =>
          TEST_FILE_PATTERN.test(file.path)
        ),
      ]
    : files;
  errors.push(...checkExportTraceability(traceabilityFiles).errors);

  if (staged) {
    for (const file of files.filter(
      (candidate) =>
        candidate.path.startsWith("src/") &&
        SOURCE_FILE_PATTERN.test(candidate.path)
    )) {
      warnings.push(...checkNewExports(file.content, file.path).warnings);
    }
  }

  for (const file of files) {
    errors.push(...checkCatalog(file.content, file.path, catalog).errors);
  }

  for (const error of errors) console.error(error);
  for (const warning of warnings) console.warn(warning);

  if (errors.length > 0) {
    console.error(
      `lint:req — ${errors.length} violation(s), ${warnings.length} warning(s)`
    );
    process.exitCode = 1;
    return;
  }

  console.log(`lint:req — OK (${warnings.length} warning(s))`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  runCli();
}

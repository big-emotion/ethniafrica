#!/usr/bin/env tsx
/**
 * Diff-scoped translation parity gate (REQ-145).
 *
 * A source record and its English sidecar move together. A source-only record
 * may opt out temporarily through `_translation.deferred.en`, but only with a
 * written reason. Existing pairs must keep the same field shape and the
 * hashes stored by `translate:record` must still describe the current source.
 * Registered UI dictionaries and the bilingual glossary ride on the same
 * command, so CI has one blocking translation contract.
 *
 * `--base <ref>` and `--staged` block. A bare run (or `--all`) surveys the
 * complete corpus and exits zero so the pre-existing translation backlog is
 * visible without making the rollout unsafe.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, type Dirent } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  fieldHashes,
  sourceHash,
  translatableLeaves,
} from "@/lib/afrik/translations/hashing";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import {
  CORPUS_ROOT,
  listTranslationSidecars,
  TRANSLATIONS_ROOT,
} from "@/lib/afrik/translations/sidecarPaths";
import { translationViolations } from "@/lib/afrik/translations/sidecarIntegrity";
import {
  ENTITY_TYPE_BY_CORPUS_DIRECTORY,
  modelForEntity,
  stripTranslationBlock,
  translationBlockSchema,
  type TranslationBlock,
} from "@/lib/afrik/translations/types";
import { COPY_MODULES } from "@/lib/i18n/copy";
import { ficheMetadataCopy } from "@/lib/i18n/copy/ficheMetadata";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import { escapeWorkflowCommand } from "./checkEditorialRules";
import { runGlossaryGate } from "./checkGlossary";

export type ParityRule =
  | "missing-translation"
  | "missing-source"
  | "field-missing-in-translation"
  | "field-missing-in-source"
  | "translation-drift"
  | "invalid-deferral"
  | "invalid-json"
  | "invalid-sidecar"
  | "invalid-sidecar-field"
  | "ui-dictionary-parity"
  | "glossary";

export interface ParityFinding {
  rule: ParityRule;
  severity: "error";
  file: string;
  record: string;
  field: string;
  message: string;
}

export interface ParityNotice {
  rule: "translation-deferred";
  file: string;
  record: string;
  lang: TranslationLocale;
  reason: string;
  message: string;
}

export interface PairResult {
  findings: ParityFinding[];
  notices: ParityNotice[];
}

export type ParityMode =
  { kind: "survey" } | { kind: "staged" } | { kind: "base"; ref: string };

export interface RegisteredUiDictionary {
  name: string;
  file: string;
  dictionary: Record<string, unknown>;
}

export interface RunTranslationParityOptions {
  repoRoot: string;
  mode: ParityMode;
  changedPaths?: readonly string[];
  uiDictionaries?: readonly RegisteredUiDictionary[];
  includeGlossary?: boolean;
}

export interface TranslationParityResult extends PairResult {
  blocking: boolean;
  exitCode: 0 | 1;
  recordsScanned: number;
}

const SOURCE_PREFIX = `${CORPUS_ROOT}/`;
const EN_TRANSLATION_PREFIX = `${TRANSLATIONS_ROOT}/en/`;
const SOURCE_AUTHORING_KEY = "_translation";
const SKIP_SOURCE_DIRECTORIES = new Set(["archive", "logs"]);
const UI_PARITY_EXEMPT_SUBTREES = new Set(["trail.segments"]);

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceWithoutAuthoringBlock(
  source: Record<string, unknown>
): Record<string, unknown> {
  const content = { ...source };
  delete content[SOURCE_AUTHORING_KEY];
  return content;
}

function recordId(
  record: Record<string, unknown> | null,
  relativePath: string
): string {
  return record && typeof record.id === "string"
    ? record.id
    : path.posix.basename(relativePath, ".json");
}

function finding(input: Omit<ParityFinding, "severity">): ParityFinding {
  return { ...input, severity: "error" };
}

function shapePaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    const paths = prefix ? [prefix] : [];
    value.forEach((child, index) => {
      paths.push(...shapePaths(child, `${prefix}[${index}]`));
    });
    return paths;
  }
  if (isRecord(value)) {
    const paths = prefix ? [prefix] : [];
    for (const [key, child] of Object.entries(value)) {
      const childPath = prefix ? `${prefix}.${key}` : key;
      paths.push(...shapePaths(child, childPath));
    }
    return paths;
  }
  return prefix ? [prefix] : [];
}

function firstReaderField(
  relativePath: string,
  record: Record<string, unknown>
): string {
  const [directory] = relativePath.split("/");
  const entityType = ENTITY_TYPE_BY_CORPUS_DIRECTORY[directory];
  if (entityType) {
    try {
      const model = modelForEntity(entityType, record);
      const first = translatableLeaves(record, classifierFor(model))[0];
      if (first) return first.path;
    } catch {
      // Fall through to the structural field for a malformed record. The JSON
      // validator will provide the schema detail; parity still names a field.
    }
  }
  return (
    shapePaths(record).find(
      (field) =>
        !field.startsWith("_meta") &&
        field !== "id" &&
        !field.endsWith("Id") &&
        !field.endsWith("Ids")
    ) ?? "$record"
  );
}

function deferralFor(
  source: Record<string, unknown>,
  lang: TranslationLocale
): { present: boolean; reason: string | null } {
  const authoring = source[SOURCE_AUTHORING_KEY];
  if (!isRecord(authoring) || !("deferred" in authoring)) {
    return { present: false, reason: null };
  }
  const deferred = authoring.deferred;
  if (!isRecord(deferred) || !(lang in deferred)) {
    return { present: false, reason: null };
  }
  const raw = deferred[lang];
  return {
    present: true,
    reason: typeof raw === "string" && raw.trim() ? raw.trim() : null,
  };
}

/** The four corpus parity rules, pure so fixtures do not need a git repo. */
// @req REQ-145
export function checkRecordPair(input: {
  relativePath: string;
  lang: TranslationLocale;
  source: Record<string, unknown> | null;
  sidecar: Record<string, unknown> | null;
}): PairResult {
  const { relativePath, lang, source, sidecar } = input;
  const sourceFile = `${CORPUS_ROOT}/${relativePath}`;
  const sidecarFile = `${TRANSLATIONS_ROOT}/${lang}/${relativePath}`;
  const sourceRecord = source ? sourceWithoutAuthoringBlock(source) : null;
  const result: PairResult = { findings: [], notices: [] };
  const id = recordId(sourceRecord, relativePath);

  if (source && !sidecar) {
    const deferral = deferralFor(source, lang);
    if (deferral.present && !deferral.reason) {
      result.findings.push(
        finding({
          rule: "invalid-deferral",
          file: sourceFile,
          record: id,
          field: `_translation.deferred.${lang}`,
          message: `${id}: _translation.deferred.${lang} requires a non-empty reason`,
        })
      );
      return result;
    }
    if (deferral.reason) {
      result.notices.push({
        rule: "translation-deferred",
        file: sourceFile,
        record: id,
        lang,
        reason: deferral.reason,
        message: `${id}: ${lang} translation deferred — ${deferral.reason}`,
      });
      return result;
    }
    result.findings.push(
      finding({
        rule: "missing-translation",
        file: sourceFile,
        record: id,
        field: firstReaderField(
          relativePath,
          sourceRecord as Record<string, unknown>
        ),
        message: `${id}: French source has no ${lang} sidecar`,
      })
    );
    return result;
  }

  if (!source && sidecar) {
    const { content } = stripTranslationBlock(sidecar);
    const orphanId = recordId(content, relativePath);
    result.findings.push(
      finding({
        rule: "missing-source",
        file: sidecarFile,
        record: orphanId,
        field: firstReaderField(relativePath, content),
        message: `${orphanId}: ${lang} sidecar has no French source`,
      })
    );
    return result;
  }

  if (!sourceRecord || !sidecar) return result;

  const [directory] = relativePath.split("/");
  if (directory === "dossiers") return result;

  const { block, content } = stripTranslationBlock(sidecar);
  const sourceFields = new Set(shapePaths(sourceRecord));
  const translatedFields = new Set(shapePaths(content));
  for (const field of [...sourceFields].filter(
    (item) => !translatedFields.has(item)
  )) {
    result.findings.push(
      finding({
        rule: "field-missing-in-translation",
        file: sidecarFile,
        record: id,
        field,
        message: `${id}: French field ${field} has no ${lang} counterpart`,
      })
    );
  }
  for (const field of [...translatedFields].filter(
    (item) => !sourceFields.has(item)
  )) {
    result.findings.push(
      finding({
        rule: "field-missing-in-source",
        file: sidecarFile,
        record: id,
        field,
        message: `${id}: ${lang} field ${field} has no French counterpart`,
      })
    );
  }

  const entityType = ENTITY_TYPE_BY_CORPUS_DIRECTORY[directory];
  if (!entityType) return result;

  const parsedBlock = translationBlockSchema.safeParse(block);
  if (!parsedBlock.success) {
    result.findings.push(
      finding({
        rule: "invalid-sidecar",
        file: sidecarFile,
        record: id,
        field: "_translation",
        message: `${id}: invalid _translation block — ${parsedBlock.error.issues
          .map(
            (issue) =>
              `${issue.path.join(".") || "_translation"}: ${issue.message}`
          )
          .join("; ")}`,
      })
    );
    return result;
  }

  const model = modelForEntity(entityType, sourceRecord);
  const classify = classifierFor(model);
  for (const violation of translationViolations({
    model,
    source: sourceRecord,
    sidecar: content,
  })) {
    result.findings.push(
      finding({
        rule: "invalid-sidecar-field",
        file: sidecarFile,
        record: id,
        field: violation.path,
        message: `${id}: ${violation.message}`,
      })
    );
  }

  const typedBlock = parsedBlock.data as TranslationBlock;
  const currentHashes = fieldHashes(sourceRecord, classify);
  const previousHashes = typedBlock.fieldHashes;
  const changedFields = new Set([
    ...Object.keys(currentHashes),
    ...Object.keys(previousHashes),
  ]);
  const alreadyMissing = new Set(
    result.findings
      .filter((item) => item.rule.startsWith("field-missing"))
      .map((item) => item.field)
  );
  const drifted = [...changedFields]
    .filter((field) => currentHashes[field] !== previousHashes[field])
    .filter((field) => !alreadyMissing.has(field))
    .sort();

  for (const field of drifted) {
    result.findings.push(
      finding({
        rule: "translation-drift",
        file: sidecarFile,
        record: id,
        field,
        message: `${id}: French source field ${field} changed after translation`,
      })
    );
  }
  if (
    typedBlock.sourceHash !== sourceHash(sourceRecord, classify) &&
    drifted.length === 0 &&
    alreadyMissing.size === 0
  ) {
    result.findings.push(
      finding({
        rule: "translation-drift",
        file: sidecarFile,
        record: id,
        field: "_translation.sourceHash",
        message: `${id}: sourceHash no longer describes the French source`,
      })
    );
  }

  return result;
}

function dictionaryLeafPaths(value: unknown, prefix: string): string[] {
  if (UI_PARITY_EXEMPT_SUBTREES.has(prefix)) return [prefix];
  if (!isRecord(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    dictionaryLeafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

/** Runtime form of the copy-parity contract for every registered module. */
// @req REQ-145
export function checkUiDictionaryParity(
  dictionaries: readonly RegisteredUiDictionary[]
): ParityFinding[] {
  const findings: ParityFinding[] = [];
  for (const source of dictionaries) {
    const fr = isRecord(source.dictionary.fr) ? source.dictionary.fr : {};
    const en = isRecord(source.dictionary.en) ? source.dictionary.en : {};
    const frPaths = new Set(dictionaryLeafPaths(fr, source.name));
    const enPaths = new Set(dictionaryLeafPaths(en, source.name));
    for (const field of [...frPaths].filter((item) => !enPaths.has(item))) {
      findings.push(
        finding({
          rule: "ui-dictionary-parity",
          file: source.file,
          record: source.name,
          field,
          message: `${source.name}: French UI key ${field} has no English counterpart`,
        })
      );
    }
    for (const field of [...enPaths].filter((item) => !frPaths.has(item))) {
      findings.push(
        finding({
          rule: "ui-dictionary-parity",
          file: source.file,
          record: source.name,
          field,
          message: `${source.name}: English UI key ${field} has no French counterpart`,
        })
      );
    }
  }
  return findings;
}

// @req REQ-145
export function resolveParityMode(argv: string[]): ParityMode {
  if (argv.includes("--staged")) return { kind: "staged" };
  const baseIndex = argv.indexOf("--base");
  if (baseIndex !== -1) {
    const ref = argv[baseIndex + 1];
    if (!ref || ref.startsWith("--")) {
      throw new Error("--base requires a git ref (e.g. --base origin/recette)");
    }
    return { kind: "base", ref };
  }
  return { kind: "survey" };
}

function gitChangedPaths(
  repoRoot: string,
  mode: Exclude<ParityMode, { kind: "survey" }>
): string[] {
  const args =
    mode.kind === "staged"
      ? [
          "diff",
          "--cached",
          "--name-only",
          "--no-renames",
          "--diff-filter=AMRD",
        ]
      : [
          "diff",
          "--name-only",
          "--no-renames",
          "--diff-filter=AMRD",
          `${mode.ref}...HEAD`,
        ];
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listSourceRecords(root: string): string[] {
  const found: string[] = [];
  const walk = (directory: string, relative: string) => {
    let entries: Dirent[];
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith("_")) continue;
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_SOURCE_DIRECTORIES.has(entry.name)) {
          walk(path.join(directory, entry.name), childRelative);
        }
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        found.push(childRelative);
      }
    }
  };
  walk(root, "");
  return found.sort();
}

function impactedRecords(
  repoRoot: string,
  mode: ParityMode,
  suppliedChangedPaths?: readonly string[]
): string[] {
  if (mode.kind === "survey") {
    const source = listSourceRecords(path.join(repoRoot, CORPUS_ROOT));
    const translated = listTranslationSidecars(
      path.join(repoRoot, TRANSLATIONS_ROOT),
      "en"
    );
    return [...new Set([...source, ...translated])].sort();
  }
  const changed = suppliedChangedPaths ?? gitChangedPaths(repoRoot, mode);
  const records = changed.flatMap((file) => {
    const normalized = toPosix(file);
    if (normalized.startsWith(SOURCE_PREFIX)) {
      return [normalized.slice(SOURCE_PREFIX.length)];
    }
    if (normalized.startsWith(EN_TRANSLATION_PREFIX)) {
      return [normalized.slice(EN_TRANSLATION_PREFIX.length)];
    }
    return [];
  });
  return [
    ...new Set(
      records.filter(
        (file) =>
          file.endsWith(".json") && !path.posix.basename(file).startsWith("_")
      )
    ),
  ].sort();
}

function readJson(file: string): Record<string, unknown> | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
}

// @req REQ-145
export const TRANSLATION_UI_DICTIONARIES: readonly RegisteredUiDictionary[] = [
  ...Object.entries(COPY_MODULES).map(([name, dictionary]) => ({
    name,
    file: "src/lib/i18n/copy/index.ts",
    dictionary,
  })),
  {
    name: "ficheMetadata",
    file: "src/lib/i18n/copy/ficheMetadata.ts",
    dictionary: ficheMetadataCopy,
  },
];

// @req REQ-145
export function runTranslationParity(
  options: RunTranslationParityOptions
): TranslationParityResult {
  const findings: ParityFinding[] = [];
  const notices: ParityNotice[] = [];
  const records = impactedRecords(
    options.repoRoot,
    options.mode,
    options.changedPaths
  );

  for (const relativePath of records) {
    const sourceFile = path.join(options.repoRoot, CORPUS_ROOT, relativePath);
    const sidecarFile = path.join(
      options.repoRoot,
      TRANSLATIONS_ROOT,
      "en",
      relativePath
    );
    let source: Record<string, unknown> | null;
    let sidecar: Record<string, unknown> | null;
    try {
      source = readJson(sourceFile);
    } catch (error) {
      findings.push(
        finding({
          rule: "invalid-json",
          file: `${CORPUS_ROOT}/${relativePath}`,
          record: path.posix.basename(relativePath, ".json"),
          field: "$record",
          message: `Invalid French JSON: ${error instanceof Error ? error.message : String(error)}`,
        })
      );
      continue;
    }
    try {
      sidecar = readJson(sidecarFile);
    } catch (error) {
      findings.push(
        finding({
          rule: "invalid-json",
          file: `${TRANSLATIONS_ROOT}/en/${relativePath}`,
          record: path.posix.basename(relativePath, ".json"),
          field: "$record",
          message: `Invalid English JSON: ${error instanceof Error ? error.message : String(error)}`,
        })
      );
      continue;
    }
    const pair = checkRecordPair({
      relativePath,
      lang: "en",
      source,
      sidecar,
    });
    findings.push(...pair.findings);
    notices.push(...pair.notices);
  }

  findings.push(
    ...checkUiDictionaryParity(
      options.uiDictionaries ?? TRANSLATION_UI_DICTIONARIES
    )
  );

  if (options.includeGlossary !== false) {
    const glossary = runGlossaryGate({ repoRoot: options.repoRoot });
    findings.push(
      ...glossary.findings.map((item) =>
        finding({
          rule: "glossary",
          file: item.file,
          record: item.record,
          field: item.path,
          message: item.message,
        })
      )
    );
  }

  const blocking = options.mode.kind !== "survey";
  return {
    findings,
    notices,
    blocking,
    exitCode: blocking && findings.length > 0 ? 1 : 0,
    recordsScanned: records.length,
  };
}

function annotation(item: ParityFinding): string {
  return `::error file=${toPosix(item.file)},title=${escapeWorkflowCommand(item.rule)}::${escapeWorkflowCommand(`${item.record} — ${item.field}: ${item.message}`)}`;
}

function noticeAnnotation(item: ParityNotice): string {
  return `::notice file=${toPosix(item.file)},title=translation-deferred::${escapeWorkflowCommand(item.message)}`;
}

function main(): void {
  let mode: ParityMode;
  try {
    mode = resolveParityMode(process.argv.slice(2));
  } catch (error) {
    console.error(
      `check:translation-parity — ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 2;
    return;
  }

  const result = runTranslationParity({ repoRoot: process.cwd(), mode });
  result.notices.forEach((item) => console.log(noticeAnnotation(item)));
  result.findings.forEach((item) => console.log(annotation(item)));
  const posture = result.blocking ? "blocking" : "survey; not blocking";
  console.error(
    `check:translation-parity — ${result.findings.length} finding(s), ${result.notices.length} deferral(s), ${result.recordsScanned} record(s) scanned (${posture})`
  );
  process.exitCode = result.exitCode;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main();
}

/**
 * The translation pipeline, pure with respect to the provider (REQ-146).
 *
 * One record goes: source fiche → skeleton (invariants kept, the leaves that
 * translate listed with their class) → prompt → provider → reassembly →
 * verification → sidecar. The provider is injected, so the tests run the
 * whole pipeline on a temp corpus with a fake and the real CLI is spawned
 * only by scripts/translateRecord.ts.
 *
 * Verification is where the class doctrine bites the machine: the assembled
 * record must have the source's key set and order, every invariant
 * byte-equal (a glossed invariant's name included), every leaf answered, no
 * path invented, and no glossary term rendered the way the glossary forbids.
 * A refused answer is sent back once with the reasons; a second refusal is
 * a loud failure, never a silently partial sidecar.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { GLOSSARY_TERMS } from "@/lib/glossaire/terms";
import {
  driftedPaths,
  fieldHashes,
  sourceHash,
  translatableLeaves,
  type TranslatableLeaf,
} from "@/lib/afrik/translations/hashing";
import {
  classifierFor,
  type LeafClassifier,
} from "@/lib/afrik/translations/leafClassifier";
import type {
  TranslationProvider,
  TranslationRequest,
} from "@/lib/afrik/translations/provider";
import {
  readTranslationSidecar,
  writeTranslationSidecar,
} from "@/lib/afrik/translations/sidecarPaths";
import {
  ENTITY_TYPE_BY_CORPUS_DIRECTORY,
  modelForEntity,
  stripTranslationBlock,
  TRANSLATION_BLOCK_KEY,
  type TranslationBlock,
  type TranslationEntityType,
  type TranslationSidecar,
} from "@/lib/afrik/translations/types";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import {
  formatSegments,
  recordLeaves,
  valueAt,
} from "@/lib/i18n/modelLeafPaths";
import { glossedInvariantName } from "@/lib/i18n/translationClasses";
import { translationViolations } from "@/lib/afrik/translations/sidecarIntegrity";
import { checkTranslatedRecord } from "../ci/checkGlossary";

// ───── Resolution ─────────────────────────────────────────────────────────

const DIRECTORY_BY_PREFIX: ReadonlyArray<[RegExp, string]> = [
  [/^FLG_/, "famille_linguistique"],
  [/^PAT_/, "patronymes"],
  [/^REL_/, "relations"],
  [/^MGR_/, "migrations"],
  [/^ONS_/, "systemes_onomastiques"],
  [/^[A-Z]{3}$/, "pays"],
  [/^[a-z]{3}$/, "langues"],
];

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

/**
 * What a human types — `PPL_ASANTE`, `GHA`, `lin`, `noms/PPL_DOGON` — to a
 * path relative to the corpus root. A people is found through its family
 * folder; an ethnonym dossier shares its id with the people and is reached
 * by naming the directory.
 */
// @req REQ-146
export function resolveRecordPath(
  idOrPath: string,
  corpusRoot: string
): string {
  const candidate = idOrPath.endsWith(".json") ? idOrPath : `${idOrPath}.json`;
  if (candidate.includes("/")) {
    if (existsSync(join(corpusRoot, candidate))) return toPosix(candidate);
    throw new Error(
      `${idOrPath}: no fiche at ${candidate} under ${corpusRoot}`
    );
  }

  if (/^PPL_/.test(idOrPath)) {
    const peoples = join(corpusRoot, "peuples");
    const families = existsSync(peoples)
      ? readdirSync(peoples, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : [];
    for (const family of families) {
      if (existsSync(join(peoples, family, candidate))) {
        return `peuples/${family}/${candidate}`;
      }
    }
    throw new Error(`${idOrPath}: no people fiche under peuples/*/`);
  }

  const match = DIRECTORY_BY_PREFIX.find(([pattern]) => pattern.test(idOrPath));
  if (!match) {
    throw new Error(
      `${idOrPath}: not a corpus identifier (PPL_, FLG_, PAT_, REL_, MGR_, ONS_, ISO 3166-1 alpha-3, ISO 639-3) nor a path under the corpus`
    );
  }
  const relativePath = `${match[1]}/${candidate}`;
  if (!existsSync(join(corpusRoot, relativePath))) {
    throw new Error(`${idOrPath}: no fiche at ${relativePath}`);
  }
  return relativePath;
}

function isIllustrative(record: Record<string, unknown>): boolean {
  const meta = record._meta;
  return (
    typeof meta === "object" &&
    meta !== null &&
    (meta as { illustrative?: unknown }).illustrative === true
  );
}

/**
 * Every fiche under a directory, recursively, as paths relative to the
 * corpus root. Worksheets (`_`-prefixed), `logs/`, `archive/` and
 * illustrative fixtures are not records and are not translated.
 */
// @req REQ-146
export function listBatchRecords(
  corpusRoot: string,
  batchDir: string
): string[] {
  const found: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === "logs" || entry.name === "archive") continue;
        walk(join(directory, entry.name));
        continue;
      }
      if (!entry.name.endsWith(".json") || entry.name.startsWith("_")) continue;
      const file = join(directory, entry.name);
      if (isIllustrative(readRecord(file))) continue;
      found.push(toPosix(relative(corpusRoot, file)));
    }
  };
  walk(batchDir);
  return found.sort();
}

function readRecord(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
}

// @req REQ-146
export function entityTypeOf(relativePath: string): TranslationEntityType {
  const entityType =
    ENTITY_TYPE_BY_CORPUS_DIRECTORY[relativePath.split("/")[0]];
  if (!entityType) {
    throw new Error(`${relativePath}: not under a corpus directory`);
  }
  return entityType;
}

// ───── Skeleton and prompt ────────────────────────────────────────────────

export interface Skeleton {
  /** String invariants, carried verbatim; listed so a dry run can show them. */
  invariants: Array<{ path: string; value: string }>;
  leaves: TranslatableLeaf[];
  /** Concrete paths of the class-3 leaves — the sidecar's reviewRequired. */
  reviewRequired: string[];
}

// @req REQ-146
export function buildSkeleton(
  record: Record<string, unknown>,
  classify: LeafClassifier
): Skeleton {
  const leaves = translatableLeaves(record, classify);
  const translated = new Set(leaves.map((leaf) => leaf.path));
  const invariants = recordLeaves(record).flatMap((leaf) => {
    const path = formatSegments(leaf.segments);
    return typeof leaf.value === "string" && !translated.has(path)
      ? [{ path, value: leaf.value }]
      : [];
  });
  return {
    invariants,
    leaves,
    reviewRequired: leaves
      .filter((leaf) => leaf.class === "review_required")
      .map((leaf) => leaf.path),
  };
}

/**
 * The register the translator skill will carry in
 * .claude/skills/afrik-translator/reference/{register,glossary}.md. Until
 * that skill lands, this is the whole of it; once it does, the files win.
 */
const BUILT_IN_REGISTER = `You translate records of an atlas of African peoples, languages and names from French into English.

Register: British spelling (colour, organisation, centre); present tense for what is the case today, past tense for events; no contractions; plain declarative sentences; keep the source's paragraphing, and keep its punctuation conventions where English has an equivalent. No markdown. Do not add, drop or reorder information; do not soften or editorialise. A century is written as "the 18th century". Proper names, autonyms, exonyms, identifiers, ISO codes, URLs and source titles are never translated — you only receive the leaves that translate.`;

function glossaryRulings(): string {
  const lines = GLOSSARY_TERMS.flatMap((term) => {
    const forbidden = term.forbiddenEn?.length
      ? ` — never ${term.forbiddenEn.map((word) => `"${word}"`).join(", ")}`
      : "";
    if (term.fr.toLowerCase() === term.en.toLowerCase() && !forbidden)
      return [];
    return [`- « ${term.fr} » → "${term.en}"${forbidden}`];
  });
  return `Glossary rulings, mandatory:\n${lines.join("\n")}`;
}

const CLASS_INSTRUCTIONS = `Each leaf carries a class:
- "translatable": translate the text.
- "review_required": translate faithfully; a human reviews it before it is published, so do not hedge.
- "glossed_invariant": the value is a name followed by a parenthetical gloss. Keep everything before the first parenthesis byte for byte and translate only the text inside the parentheses.

Answer with one JSON object {"translations": {"<path>": "<english>"}} carrying exactly the paths you received — no more, no fewer — and nothing else.`;

export interface PromptInput {
  recordId: string;
  entityType: TranslationEntityType;
  skeleton: Skeleton;
  /** The skill's register and glossary files, when they exist; null otherwise. */
  registerBlock: string | null;
  /** Reasons a previous answer was refused, for the one retry. */
  refusals?: string[];
}

// @req REQ-146
export function buildPrompt(
  input: PromptInput
): Pick<TranslationRequest, "systemPrompt" | "userPrompt" | "jsonSchema"> {
  const systemPrompt = [
    input.registerBlock ?? BUILT_IN_REGISTER,
    glossaryRulings(),
    CLASS_INSTRUCTIONS,
  ].join("\n\n");

  const userPrompt = JSON.stringify({
    instruction: `Translate the leaves of ${input.entityType} record ${input.recordId} into English.`,
    record: input.recordId,
    leaves: input.skeleton.leaves.map((leaf) => ({
      path: leaf.path,
      class: leaf.class,
      ...(leaf.class === "glossed_invariant"
        ? { keep: glossedInvariantName(leaf.text) }
        : {}),
      text: leaf.text,
    })),
    ...(input.refusals?.length
      ? {
          previousAnswerRefused: input.refusals,
          instructionOnRetry:
            "Your previous answer was refused for the reasons above. Answer again, correcting exactly those points.",
        }
      : {}),
  });

  const jsonSchema = {
    type: "object",
    properties: {
      translations: {
        type: "object",
        additionalProperties: { type: "string" },
      },
    },
    required: ["translations"],
    additionalProperties: false,
  };

  return { systemPrompt, userPrompt, jsonSchema };
}

// @req REQ-146
export function loadRegisterBlock(referenceDir: string): string | null {
  const parts = ["register.md", "glossary.md"]
    .map((name) => join(referenceDir, name))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf-8").trim());
  return parts.length > 0 ? parts.join("\n\n") : null;
}

// ───── Reassembly and verification ────────────────────────────────────────

type Segment = string | number;

function segmentsOf(path: string): Segment[] {
  return path
    .split(".")
    .flatMap((part) => {
      const [key, ...indices] = part.split("[");
      return [key, ...indices.map((index) => Number(index.replace("]", "")))];
    })
    .filter((segment) => segment !== "");
}

function assign(target: unknown, path: string, value: string): void {
  const segments = segmentsOf(path);
  const parent = valueAt(target, segments.slice(0, -1));
  if (parent === null || typeof parent !== "object") return;
  (parent as Record<string, unknown>)[segments[segments.length - 1] as string] =
    value;
}

// @req REQ-146
export function assembleTranslation(
  source: Record<string, unknown>,
  translations: Record<string, string>,
  leaves: TranslatableLeaf[]
): Record<string, unknown> {
  const content = structuredClone(source);
  for (const leaf of leaves) {
    const text = translations[leaf.path];
    if (typeof text === "string") assign(content, leaf.path, text);
  }
  return content;
}

// @req REQ-146
export function verifyAssembled(input: {
  model: ReturnType<typeof modelForEntity>;
  source: Record<string, unknown>;
  content: Record<string, unknown>;
  leaves: TranslatableLeaf[];
  translations: Record<string, string>;
  file: string;
}): string[] {
  const problems: string[] = [];
  const expected = new Set(input.leaves.map((leaf) => leaf.path));

  for (const leaf of input.leaves) {
    const text = input.translations[leaf.path];
    if (typeof text !== "string" || text.trim() === "") {
      problems.push(`${leaf.path}: no translation returned`);
    }
  }
  for (const path of Object.keys(input.translations)) {
    if (!expected.has(path))
      problems.push(`${path}: not a leaf that was asked for`);
  }

  const sourcePaths = recordLeaves(input.source).map((leaf) =>
    formatSegments(leaf.segments)
  );
  const contentPaths = recordLeaves(input.content).map((leaf) =>
    formatSegments(leaf.segments)
  );
  if (sourcePaths.join("\n") !== contentPaths.join("\n")) {
    problems.push("the assembled record does not have the source's leaf paths");
  }

  for (const violation of translationViolations({
    model: input.model,
    source: input.source,
    sidecar: input.content,
  })) {
    problems.push(`${violation.path}: ${violation.message}`);
  }

  for (const finding of checkTranslatedRecord(input.content, input.file)) {
    problems.push(finding.message);
  }

  return problems;
}

// ───── One record ─────────────────────────────────────────────────────────

export interface TranslateOptions {
  lang: TranslationLocale;
  corpusRoot: string;
  translationsRoot: string;
  model: string;
  maxBudgetUsd: number;
  force: boolean;
  drift: boolean;
  dryRun: boolean;
  /** `.claude/skills/afrik-translator/reference`, read at run time when present. */
  registerReferenceDir?: string;
  now?: () => Date;
}

export type RecordOutcome =
  | { status: "skipped"; relativePath: string; reason: string }
  | {
      status: "dry-run";
      relativePath: string;
      skeleton: Skeleton;
      prompt: Pick<
        TranslationRequest,
        "systemPrompt" | "userPrompt" | "jsonSchema"
      >;
    }
  | {
      status: "translated";
      relativePath: string;
      model: string;
      costUsd: number;
      leaves: number;
      driftedPaths?: string[];
    }
  | { status: "failed"; relativePath: string; reason: string; costUsd: number };

interface ExistingSidecar {
  content: Record<string, unknown>;
  block: TranslationBlock;
}

function readExisting(file: string): ExistingSidecar | null {
  if (!existsSync(file)) return null;
  const sidecar = readTranslationSidecar(file);
  const { block, content } = stripTranslationBlock(sidecar);
  return { content, block: block as TranslationBlock };
}

function parseTranslations(output: unknown): Record<string, string> | null {
  if (typeof output !== "object" || output === null) return null;
  const translations = (output as { translations?: unknown }).translations;
  if (typeof translations !== "object" || translations === null) return null;
  const clean: Record<string, string> = {};
  for (const [path, text] of Object.entries(translations)) {
    if (typeof text === "string") clean[path] = text;
  }
  return clean;
}

// @req REQ-146
export async function translateRecord(
  relativePath: string,
  options: TranslateOptions,
  provider: TranslationProvider
): Promise<RecordOutcome> {
  const source = readRecord(join(options.corpusRoot, relativePath));
  const entityType = entityTypeOf(relativePath);
  const model = modelForEntity(entityType, source);
  const classify = classifierFor(model);
  const recordId = typeof source.id === "string" ? source.id : relativePath;
  const sidecarFile = join(
    options.translationsRoot,
    options.lang,
    relativePath
  );
  const currentHash = sourceHash(source, classify);

  const existing = readExisting(sidecarFile);
  if (existing && !options.force && existing.block.sourceHash === currentHash) {
    return { status: "skipped", relativePath, reason: "sidecar is up to date" };
  }

  const skeleton = buildSkeleton(source, classify);
  let leavesToAsk = skeleton.leaves;
  let drifted: string[] | undefined;
  if (existing && options.drift && !options.force) {
    const changed = new Set(
      driftedPaths(source, existing.block.fieldHashes, classify)
    );
    leavesToAsk = skeleton.leaves.filter(
      (leaf) =>
        changed.has(leaf.path) || !(leaf.path in existing.block.fieldHashes)
    );
    drifted = [...changed].sort();
  }

  const registerBlock = options.registerReferenceDir
    ? loadRegisterBlock(options.registerReferenceDir)
    : null;
  const promptInput: PromptInput = {
    recordId,
    entityType,
    skeleton: { ...skeleton, leaves: leavesToAsk },
    registerBlock,
  };

  if (options.dryRun) {
    return {
      status: "dry-run",
      relativePath,
      skeleton: promptInput.skeleton,
      prompt: buildPrompt(promptInput),
    };
  }

  // Leaves not asked again keep the wording the existing sidecar holds.
  const kept: Record<string, string> = {};
  if (existing && leavesToAsk.length < skeleton.leaves.length) {
    for (const leaf of skeleton.leaves) {
      const held = valueAt(existing.content, segmentsOf(leaf.path));
      if (typeof held === "string") kept[leaf.path] = held;
    }
  }

  let costUsd = 0;
  let translatingModel = options.model;
  let refusals: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = buildPrompt({ ...promptInput, refusals });
    const result = await provider.translate({
      ...prompt,
      model: options.model,
      maxBudgetUsd: options.maxBudgetUsd,
    });
    // `=== false`, not `!`: with strictNullChecks off, a truthiness test does
    // not narrow the discriminated union.
    if (result.ok === false) {
      const reason = result.terminalReason
        ? `${result.error} (${result.terminalReason})`
        : result.error;
      return { status: "failed", relativePath, reason, costUsd };
    }
    costUsd += result.costUsd;
    translatingModel = result.model;

    const answered = parseTranslations(result.output);
    if (!answered) {
      refusals = [
        "the answer was not an object of the form {translations: {path: text}}",
      ];
      continue;
    }
    const translations = { ...kept, ...answered };
    const content = assembleTranslation(source, translations, skeleton.leaves);
    const problems = verifyAssembled({
      model,
      source,
      content,
      leaves: skeleton.leaves,
      translations,
      file: `${options.translationsRoot}/${options.lang}/${relativePath}`,
    });
    if (problems.length > 0) {
      refusals = problems;
      continue;
    }

    const block: TranslationBlock = {
      kind: "machine",
      translatedAt: (options.now ?? (() => new Date()))().toISOString(),
      model: translatingModel,
      sourceHash: currentHash,
      fieldHashes: fieldHashes(source, classify),
      reviewRequired: skeleton.reviewRequired,
    };
    const sidecar: TranslationSidecar = {
      ...content,
      [TRANSLATION_BLOCK_KEY]: block,
    };
    await writeTranslationSidecar(sidecarFile, sidecar);
    return {
      status: "translated",
      relativePath,
      model: translatingModel,
      costUsd,
      leaves: leavesToAsk.length,
      ...(drifted ? { driftedPaths: drifted } : {}),
    };
  }

  return {
    status: "failed",
    relativePath,
    reason: `refused twice — ${refusals.join("; ")}`,
    costUsd,
  };
}

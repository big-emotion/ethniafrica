/**
 * Removes the tiering codemod's reasoning from reader-facing source notes.
 *
 * `scripts/codemods/tierStringSources.ts` once wrote, into every `notes` it
 * produced, which catalogue entry or domain ruling had set the tier — or that
 * nobody had ruled yet. `sources[].notes` is published verbatim, so 4 300 notes
 * told visitors "the tier awaits editorial review". The codemod no longer writes
 * those sentences; this removes the ones already in the corpus.
 *
 * Only the exact generated sentences go. A curator's text around them stays,
 * and a hand-written variant ("…catalogue entry for Glottolog; supports the Kru
 * classification.") is left for a curator: the reader-facing-register gate
 * names it, and guessing where a human sentence ends is how genuine text would
 * be lost.
 *
 * Files are edited as text, never re-serialised, so each fiche keeps its own
 * indentation, key order and line layout. Every edit is checked against the
 * same change made on the parsed record before anything is written.
 *
 * Two consequences of editing a French record are handled in the same pass,
 * because the translation-parity gate refuses the change otherwise:
 * - a record with an English sidecar has the same sentences stripped from the
 *   sidecar and its hashes refreshed — only for fields that were in sync before,
 *   so an existing drift stays visible;
 * - a record with no sidecar receives `_translation.deferred.en`, the one
 *   deferral form the gate accepts, reusing the corpus's existing wording.
 *
 * Usage: npx tsx scripts/afrik/stripTierProvenanceNotes.ts [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";

import {
  canonicalize,
  fieldHashes,
  sourceHash,
} from "@/lib/afrik/translations/hashing";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import {
  CORPUS_ROOT,
  listTranslationSidecars,
  TRANSLATIONS_ROOT,
} from "@/lib/afrik/translations/sidecarPaths";
import {
  ENTITY_TYPE_BY_CORPUS_DIRECTORY,
  modelForEntity,
} from "@/lib/afrik/translations/types";

const DOMAIN = String.raw`[\w-]+(?:\.[\w-]+)+`;

const TIER_PROVENANCE_SENTENCES: ReadonlyArray<string> = [
  String.raw`Tier resolved from the domain ruling for ${DOMAIN}(?:, matched as a parent of ${DOMAIN})?\.`,
  String.raw`Tier resolved from the authorized source catalogue entry (?:"[^"]+"(?: \(${DOMAIN}\), matched as a parent of ${DOMAIN})?|for [\p{L} ]+)\.`,
  String.raw`Tier inferred from published-citation shape \(named author and publication year\); no domain ruling applies\.`,
  String.raw`No (?:URL and no recognisable citation shape|domain ruling covers ${DOMAIN}); the tier awaits editorial review\.`,
];

// Every sentence ends on a period, and so does every label of a hostname: the
// lookahead keeps "…ruling for searchworks.stanford.edu (library catalogue…"
// from being read as a sentence that ends after "stanford.".
const TIER_PROVENANCE = new RegExp(
  String.raw`\s*(?:${TIER_PROVENANCE_SENTENCES.join("|")})(?=\s|$)\s*`,
  "gu"
);

export function stripTierProvenance(note: string): string {
  const stripped = note.replace(TIER_PROVENANCE, " ");
  return stripped === note ? note : stripped.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withSourceNotesStripped(
  value: unknown,
  key?: string,
  isSourceEntry = false
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      withSourceNotesStripped(item, undefined, key === "sources")
    );
  }
  if (!isRecord(value)) return value;

  const copy: Record<string, unknown> = {};
  for (const [childKey, child] of Object.entries(value)) {
    if (isSourceEntry && childKey === "notes" && typeof child === "string") {
      const stripped = stripTierProvenance(child);
      if (stripped !== "") copy[childKey] = stripped;
      continue;
    }
    copy[childKey] = withSourceNotesStripped(child, childKey);
  }
  return copy;
}

const WHITESPACE = /\s/;

/**
 * Deletes the property spanning [start, end) together with the one comma that
 * separated it from a neighbour, so the object stays valid JSON whether the
 * property was first, last or in between.
 */
function removeProperty(text: string, start: number, end: number): string {
  let before = start;
  while (before > 0 && WHITESPACE.test(text[before - 1])) before -= 1;
  if (text[before - 1] === ",") {
    return text.slice(0, before - 1) + text.slice(end);
  }

  let after = end;
  while (after < text.length && WHITESPACE.test(text[after])) after += 1;
  if (text[after] === ",") {
    after += 1;
    while (after < text.length && WHITESPACE.test(text[after])) after += 1;
    return text.slice(0, start) + text.slice(after);
  }
  return text.slice(0, start) + text.slice(end);
}

export interface RecordStrip {
  text: string;
  rewrittenNotes: number;
  removedNotes: number;
}

const NOTES_PROPERTY = /"notes"\s*:\s*("(?:[^"\\]|\\.)*")/g;

export function stripTierProvenanceFromRecord(raw: string): RecordStrip {
  const edits: Array<{
    start: number;
    literalStart: number;
    end: number;
    note: string;
  }> = [];
  for (const match of raw.matchAll(NOTES_PROPERTY)) {
    const original = JSON.parse(match[1]) as string;
    const note = stripTierProvenance(original);
    if (note === original) continue;
    const end = match.index + match[0].length;
    edits.push({
      start: match.index,
      literalStart: end - match[1].length,
      end,
      note,
    });
  }
  if (edits.length === 0) {
    return { text: raw, rewrittenNotes: 0, removedNotes: 0 };
  }

  let text = raw;
  for (const edit of [...edits].reverse()) {
    text =
      edit.note === ""
        ? removeProperty(text, edit.start, edit.end)
        : text.slice(0, edit.literalStart) +
          JSON.stringify(edit.note) +
          text.slice(edit.end);
  }

  const expected = canonicalize(withSourceNotesStripped(JSON.parse(raw)));
  if (
    JSON.stringify(canonicalize(JSON.parse(text))) !== JSON.stringify(expected)
  ) {
    throw new Error(
      "A generated tier sentence sits in a notes field that is not an entry of a sources array; that field is outside this script's remit and needs a curator."
    );
  }

  const removedNotes = edits.filter((edit) => edit.note === "").length;
  return {
    text,
    rewrittenNotes: edits.length - removedNotes,
    removedNotes,
  };
}

/** Appends `_translation.deferred.en` at the root, unless the record already declares a translation state. */
export function deferEnglishTranslation(raw: string, reason: string): string {
  if ("_translation" in (JSON.parse(raw) as Record<string, unknown>)) {
    return raw;
  }

  const indent = raw.match(/\n([ \t]+)"/)?.[1] ?? "  ";
  const close = raw.lastIndexOf("}");
  const body = raw.slice(0, close).trimEnd();
  const block = [
    `${indent}"_translation": {`,
    `${indent.repeat(2)}"deferred": {`,
    `${indent.repeat(3)}"en": ${JSON.stringify(reason)}`,
    `${indent.repeat(2)}}`,
    `${indent}}`,
  ].join("\n");
  return `${body},\n${block}\n${raw.slice(close)}`;
}

function withoutAuthoringBlock(
  record: Record<string, unknown>
): Record<string, unknown> {
  const content = { ...record };
  delete content._translation;
  return content;
}

function replaceProperty(
  text: string,
  key: string,
  from: string,
  to: string | null
): string {
  const property = `${JSON.stringify(key)}: ${JSON.stringify(from)}`;
  const start = text.indexOf(property);
  if (start === -1) {
    throw new Error(`Sidecar has no ${property} to update`);
  }
  const end = start + property.length;
  return to === null
    ? removeProperty(text, start, end)
    : `${text.slice(0, start)}${JSON.stringify(key)}: ${JSON.stringify(to)}${text.slice(end)}`;
}

/**
 * Moves a sidecar's stored hashes from `previousSource` to `currentSource`, for
 * the fields — and the record hash — that matched `previousSource`. A hash that
 * was already stale describes a translation someone still owes; it is left
 * stale so the parity gate keeps saying so.
 */
export function refreshSidecarHashes(
  sidecarRaw: string,
  previousSource: Record<string, unknown>,
  currentSource: Record<string, unknown>,
  relativePath: string
): string {
  const entityType =
    ENTITY_TYPE_BY_CORPUS_DIRECTORY[relativePath.split("/")[0]];
  if (!entityType) return sidecarRaw;

  const previous = withoutAuthoringBlock(previousSource);
  const current = withoutAuthoringBlock(currentSource);
  const classify = classifierFor(modelForEntity(entityType, current));
  const previousHashes = fieldHashes(previous, classify);
  const currentHashes = fieldHashes(current, classify);
  const block = (JSON.parse(sidecarRaw) as Record<string, unknown>)
    ._translation as {
    sourceHash: string;
    fieldHashes: Record<string, string>;
  };

  let text = sidecarRaw;
  for (const [field, stored] of Object.entries(block.fieldHashes)) {
    if (stored !== previousHashes[field]) continue;
    if (currentHashes[field] === stored) continue;
    text = replaceProperty(text, field, stored, currentHashes[field] ?? null);
  }

  if (block.sourceHash === sourceHash(previous, classify)) {
    text = replaceProperty(
      text,
      "sourceHash",
      block.sourceHash,
      sourceHash(current, classify)
    );
  }
  return text;
}

// ── Deferral wording ───────────────────────────────────────────────────────

/**
 * The people wording is copied verbatim from the eleven records that already
 * carry it, so the corpus gives one explanation rather than two. It names a
 * field the record must carry; the 27 people records without that field get
 * the sequencing reason the family corpus already uses.
 */
const PEOPLE_PIPELINE_REFUSAL =
  'English translation is deferred: translate:record refuses this record on content.appellations.ethnoLinguisticGroup, which modele-peuple.json does not declare and translationClasses.ts does not classify, so the pipeline carries its French verbatim and the glossary check rejects "peuples". Measured 2026-09-10: 743 of the 776 people records carry that field and none of the 776 has an English sidecar, so no people record can be translated until the declaration covers it. Both sonnet and opus refused twice.';

const PEOPLE_SEQUENCING =
  "English translation is deferred: none of the 776 people records has an English sidecar, so translating this one alone would make it the atlas's only English people record. It follows the people corpus's first translation pass.";

const FAMILY_SEQUENCING =
  "English translation is deferred: none of the 24 linguistic family records has an English sidecar, so translating this one alone would make it the atlas's only English family record. This is a sequencing choice, not a pipeline refusal. It follows the family corpus's first translation pass.";

const COUNTRY_SEQUENCING =
  "English translation is deferred: 7 of the 54 country records have an English sidecar, and this one follows the country corpus's translation pass.";

function deferralReason(
  relativePath: string,
  record: Record<string, unknown>
): string {
  const [directory] = relativePath.split("/");
  if (directory === "peuples") {
    const content = isRecord(record.content) ? record.content : {};
    const appellations = isRecord(content.appellations)
      ? content.appellations
      : {};
    return "ethnoLinguisticGroup" in appellations
      ? PEOPLE_PIPELINE_REFUSAL
      : PEOPLE_SEQUENCING;
  }
  if (directory === "famille_linguistique") return FAMILY_SEQUENCING;
  if (directory === "pays") return COUNTRY_SEQUENCING;
  throw new Error(
    `No deferral wording for ${directory}: write a true reason before stripping ${relativePath}`
  );
}

// ── CLI ────────────────────────────────────────────────────────────────────

const SKIPPED_DIRECTORIES = new Set(["archive", "logs"]);

function listRecords(root: string, relative = ""): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(path.join(root, relative), {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith("_")) continue;
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        found.push(...listRecords(root, child));
      }
    } else if (entry.name.endsWith(".json")) {
      found.push(child);
    }
  }
  return found.sort();
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const repoRoot = process.cwd();
  const corpusRoot = path.join(repoRoot, CORPUS_ROOT);
  const sidecarRoot = path.join(repoRoot, TRANSLATIONS_ROOT);
  const edited = new Map<
    string,
    { before: Record<string, unknown>; after: Record<string, unknown> }
  >();
  const tally = {
    records: 0,
    sidecars: 0,
    rewritten: 0,
    removed: 0,
    deferred: 0,
  };

  const write = (file: string, text: string) => {
    if (!dryRun) fs.writeFileSync(file, text, "utf8");
  };

  for (const relativePath of listRecords(corpusRoot)) {
    const file = path.join(corpusRoot, relativePath);
    const raw = fs.readFileSync(file, "utf8");
    const strip = stripTierProvenanceFromRecord(raw);
    if (strip.text === raw) continue;

    let text = strip.text;
    if (!fs.existsSync(path.join(sidecarRoot, "en", relativePath))) {
      const deferred = deferEnglishTranslation(
        text,
        deferralReason(relativePath, JSON.parse(text))
      );
      if (deferred !== text) tally.deferred += 1;
      text = deferred;
    }

    edited.set(relativePath, {
      before: JSON.parse(raw),
      after: JSON.parse(text),
    });
    tally.records += 1;
    tally.rewritten += strip.rewrittenNotes;
    tally.removed += strip.removedNotes;
    write(file, text);
  }

  for (const relativePath of listTranslationSidecars(sidecarRoot, "en")) {
    const file = path.join(sidecarRoot, "en", relativePath);
    const raw = fs.readFileSync(file, "utf8");
    const strip = stripTierProvenanceFromRecord(raw);
    const source = edited.get(relativePath);
    const text = source
      ? refreshSidecarHashes(
          strip.text,
          source.before,
          source.after,
          relativePath
        )
      : strip.text;
    if (text === raw) continue;

    tally.sidecars += 1;
    tally.rewritten += strip.rewrittenNotes;
    tally.removed += strip.removedNotes;
    write(file, text);
  }

  console.log(
    `${dryRun ? "Would edit" : "Edited"} ${tally.records} records and ${tally.sidecars} English sidecars: ${tally.removed} notes removed, ${tally.rewritten} notes rewritten, ${tally.deferred} English deferrals added.`
  );
}

if (process.argv[1]?.endsWith("stripTierProvenanceNotes.ts")) {
  main();
}

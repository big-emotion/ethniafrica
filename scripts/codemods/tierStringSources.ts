/**
 * Codemod — legacy string `sources` entries become structured, explicitly
 * tiered entries.
 *
 * Doctrine (CLAUDE.md, Source Tier Policy): nothing is forbidden, everything is
 * labelled. The codemod therefore never drops a citation and never guesses a
 * tier. A source whose authority cannot be established from the authorized
 * source catalogue, the domain rulings, or an unambiguous published-citation
 * shape is emitted as `needs_review` — the blocking-error state that
 * scripts/ci/checkSourceTierCoverage.ts ratchets down to zero.
 *
 * Losslessness is the other invariant: the original string is preserved
 * verbatim in `notes` whenever the cleaned title alone would not carry all of
 * it back.
 *
 * Usage: npx tsx scripts/codemods/tierStringSources.ts [--dry-run] [root]
 */
import fs from "fs";
import path from "path";
import type { SourceTier } from "@/types/sources";
import catalog from "../../config/sources/authorized-source-catalog.json";
import rulings from "../../config/sources/domain-tier-rulings.json";

/**
 * `needs_review` is deliberately not a member of `SourceTier`: it is not a
 * level of authority, it is the marker for a citation nobody has ruled on yet.
 * scripts/ci/checkSourceTierCoverage.ts is what drives it to zero.
 */
export type ResolvedTier = SourceTier | "needs_review";

export interface StructuredSource {
  title: string;
  url: string | null;
  tier: ResolvedTier;
  notes: string;
}

interface TierResolution {
  tier: ResolvedTier;
  provenance: string;
}

const DEFAULT_ROOT = "dataset/source/afrik";

const URL_PATTERN = /https?:\/\/[^\s"'<>)\]}]+/g;

/**
 * Characters that only ever separate a citation from the URL that follows it.
 * Brackets and quotes are deliberately absent: trimming the `)` of
 * "Bilen language (byn)." would unbalance the title.
 */
const TRIMMABLE = " \t\n\r-–—:;,.|/\\";

/** TRIMMABLE plus the brackets that only ever survive as an empty leftover pair. */
const DROPPABLE = `${TRIMMABLE}()[]<>`;

/** Sentence punctuation that a citation puts after a URL, never inside one. */
const URL_TRAILING_PUNCTUATION = /[.,;:!?]+$/;

// ── Tier resolution ────────────────────────────────────────────────────────

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Tiers a URL by its registrable domain, most specific ruling first, so that
 * `census.statssa.gov.za` keeps its own ruling while `wcaro.unfpa.org` inherits
 * the `unfpa.org` one. The catalogue wins over the rulings table wherever a
 * domain appears in both (domain-tier-rulings.json, `_meta.precedence`).
 */
export function resolveTierForUrl(url: string): TierResolution | null {
  const hostname = hostnameOf(url);
  if (hostname === null) return null;

  for (const entry of catalog.entries) {
    const matched = entry.matchDomains
      .filter((domain) => matchesDomain(hostname, domain))
      .sort((left, right) => right.length - left.length)[0];
    if (!matched) continue;

    return {
      tier: entry.tier as SourceTier,
      provenance:
        hostname === matched
          ? `Tier resolved from the authorized source catalogue entry "${entry.key}".`
          : `Tier resolved from the authorized source catalogue entry "${entry.key}" (${matched}), matched as a parent of ${hostname}.`,
    };
  }

  const ruling = rulings.rulings
    .filter((candidate) => matchesDomain(hostname, candidate.domain))
    .sort((left, right) => right.domain.length - left.domain.length)[0];

  if (!ruling) return null;

  return {
    tier: ruling.tier as SourceTier,
    provenance:
      hostname === ruling.domain
        ? `Tier resolved from the domain ruling for ${ruling.domain}.`
        : `Tier resolved from the domain ruling for ${ruling.domain}, matched as a parent of ${hostname}.`,
  };
}

const PUBLICATION_YEAR = /\b(1[4-9]\d{2}|20[0-3]\d)\b/;

/**
 * "Surname, Initials" or "Given Surname, Title" — the leading-author form that
 * separates a real bibliographic entry from a topic label. A bare institution
 * ("ONU – Données démographiques 2025") has no comma in that position, which is
 * exactly why the shape is the signal.
 */
const LEADING_AUTHOR =
  /^\s*\[?\p{Lu}[\p{L}'’\-]+(?:\s+\p{Lu}[\p{L}'’.\-]*){0,2},\s*\p{Lu}/u;

const ITALIC_TITLE = /\*[^*]{4,}\*/;

const COAUTHOR_LIST = /\bet al\.|\p{Lu}[\p{L}'’\-]+\s+&\s+\p{Lu}/u;

/**
 * A published work has a year plus at least one authorship signal. Anything
 * that fails this — "Recensements nationaux sud-africains", "Études
 * anthropologiques sur les peuples du Niger" — is a pointer, not a citation,
 * and goes to editorial review rather than to a guessed tier.
 */
export function looksLikePublishedCitation(text: string): boolean {
  if (!PUBLICATION_YEAR.test(text)) return false;

  return (
    LEADING_AUTHOR.test(text) ||
    ITALIC_TITLE.test(text) ||
    COAUTHOR_LIST.test(text)
  );
}

// ── String → structured entry ──────────────────────────────────────────────

function trimSeparators(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && TRIMMABLE.includes(text[start])) start += 1;
  while (end > start && TRIMMABLE.includes(text[end - 1])) end -= 1;
  return text.slice(start, end);
}

function tidyTitle(remainder: string): string {
  return trimSeparators(
    remainder.replace(/\[\s*\]|\(\s*\)|<\s*>/g, " ").replace(/\s+/g, " ")
  );
}

/**
 * True when every character dropped between `remainder` and `title` is a
 * separator or whitespace — i.e. the title still carries the whole citation.
 */
function isTitleLossless(remainder: string, title: string): boolean {
  let cursor = 0;
  for (const character of remainder) {
    if (cursor < title.length && title[cursor] === character) {
      cursor += 1;
      continue;
    }
    if (!DROPPABLE.includes(character)) return false;
  }
  return cursor === title.length;
}

export function transformSourceEntry(entry: string): StructuredSource;
export function transformSourceEntry(entry: unknown): unknown;
export function transformSourceEntry(entry: unknown): unknown {
  if (typeof entry !== "string") return entry;

  const urls = [
    ...new Set(
      (entry.match(URL_PATTERN) ?? []).map((candidate) =>
        candidate.replace(URL_TRAILING_PUNCTUATION, "")
      )
    ),
  ];
  const url = urls[0] ?? null;

  let remainder = entry;
  for (const candidate of entry.match(URL_PATTERN) ?? []) {
    remainder = remainder.split(candidate).join(" ");
  }
  const title = tidyTitle(remainder);

  const resolution = url ? resolveTierForUrl(url) : null;
  const resolved: TierResolution =
    resolution ??
    (url === null && looksLikePublishedCitation(entry)
      ? {
          tier: "referenced",
          provenance:
            "Tier inferred from published-citation shape (named author and publication year); no domain ruling applies.",
        }
      : {
          tier: "needs_review",
          provenance: url
            ? `No domain ruling covers ${hostnameOf(url) ?? url}; the tier awaits editorial review.`
            : "No URL and no recognisable citation shape; the tier awaits editorial review.",
        });

  const lossy =
    title.length === 0 || urls.length > 1 || !isTitleLossless(remainder, title);

  const notes = lossy
    ? `${resolved.provenance} Original entry: ${JSON.stringify(entry)}`
    : resolved.provenance;

  return {
    title: title.length > 0 ? title : entry,
    url,
    tier: resolved.tier,
    notes,
  } satisfies StructuredSource;
}

/** `www.` is a serving convention, not a distinct publisher — it never gets its own ruling. */
function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function transformSourceList(entries: unknown[]): unknown[] {
  return entries.map(transformSourceEntry);
}

// ── Surgical rewrite of the `sources` arrays inside a fiche ────────────────

/**
 * Finds the end index of the JSON array that starts at `start`, honouring
 * string literals and escapes so a `]` inside a title cannot close it early.
 */
function findArrayEnd(raw: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let index = start; index < raw.length; index += 1) {
    const character = raw[index];
    if (inString) {
      if (character === "\\") index += 1;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[" || character === "{") depth += 1;
    else if (character === "]" || character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("Unterminated sources array");
}

/**
 * Rewrites the `sources` arrays in place in the raw file text. Re-serialising
 * the whole document would reformat unrelated objects that Prettier keeps on
 * one line, so the diff is confined to the arrays themselves.
 */
export function replaceSourceArrays(raw: string): string {
  const keyPattern = /"sources"\s*:\s*\[/g;
  let result = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = keyPattern.exec(raw)) !== null) {
    const arrayStart = match.index + match[0].length - 1;
    const arrayEnd = findArrayEnd(raw, arrayStart);
    const original = raw.slice(arrayStart, arrayEnd + 1);
    const entries = JSON.parse(original) as unknown[];

    if (!entries.some((entry) => typeof entry === "string")) continue;

    const lineStart = raw.lastIndexOf("\n", match.index) + 1;
    const indent = raw.slice(lineStart, match.index).match(/^[ \t]*/)![0];
    const serialized = JSON.stringify(transformSourceList(entries), null, 2)
      .split("\n")
      .join(`\n${indent}`);

    result += raw.slice(cursor, arrayStart) + serialized;
    cursor = arrayEnd + 1;
    keyPattern.lastIndex = arrayEnd + 1;
  }

  return cursor === 0 ? raw : result + raw.slice(cursor);
}

// ── CLI ────────────────────────────────────────────────────────────────────

function collectJsonFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectJsonFiles(fullPath));
    else if (entry.name.endsWith(".json")) files.push(fullPath);
  }
  return files;
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const root = args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_ROOT;

  const tally: Record<string, number> = {
    official: 0,
    referenced: 0,
    unverified: 0,
    needs_review: 0,
  };
  let rewritten = 0;

  for (const filePath of collectJsonFiles(root)) {
    const raw = fs.readFileSync(filePath, "utf8");
    const next = replaceSourceArrays(raw);
    if (next === raw) continue;

    rewritten += 1;
    if (!dryRun) fs.writeFileSync(filePath, next, "utf8");

    for (const entry of JSON.stringify(JSON.parse(next)).matchAll(
      /"tier":"(official|referenced|unverified|needs_review)"/g
    )) {
      tally[entry[1]] += 1;
    }
  }

  console.log(`${dryRun ? "Would rewrite" : "Rewrote"} ${rewritten} fiches`);
  for (const [tier, count] of Object.entries(tally)) {
    console.log(`  ${tier.padEnd(13)} ${count}`);
  }
  if (!dryRun) {
    console.log("Run `npx prettier --write dataset/source/afrik` next.");
  }
}

if (process.argv[1] && process.argv[1].endsWith("tierStringSources.ts")) {
  main();
}

/**
 * The bounded package a named person reads before a translation may become
 * `machine_reviewed` (REQ-142, ETNI-1878).
 *
 * `translate:record` writes `reviewRequired` — the paths its classifier will
 * not certify on its own — and stops there. Nothing else in the pipeline reads
 * that list, so without this module the paths exist only inside the sidecars
 * and a reviewer would have to open both trees side by side to find them.
 *
 * The package deliberately renders French and English adjacent and nothing
 * else: a reviewer comparing two paragraphs of surrounding prose stops reading
 * the field under review. It never writes a sidecar and never sets a
 * provenance kind — promoting `machine` to `machine_reviewed` is a human act
 * recorded against a human name, and a tool that could perform it would make
 * the distinction unverifiable.
 */

import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import {
  TRANSLATION_BLOCK_KEY,
  type TranslationBlock,
  type TranslationKind,
} from "@/lib/afrik/translations/types";

/** One record's French source and the English sidecar proposed for it. */
export interface ReviewSubject {
  recordId: string;
  sourceRelativePath: string;
  source: Record<string, unknown>;
  sidecar: Record<string, unknown>;
}

export interface ReviewItem {
  path: string;
  french: string | null;
  english: string | null;
  /** The path is absent from the source: a stale review list, not a translation to read. */
  unresolved: boolean;
}

export interface ReviewProvenance {
  kind: TranslationKind;
  model: string | null;
  translatedAt: string;
  reviewedBy: string | null;
  sourceHash: string;
}

export interface ReviewRecord {
  recordId: string;
  sourceRelativePath: string;
  provenance: ReviewProvenance;
  items: ReviewItem[];
}

export interface ReviewPackage {
  lang: TranslationLocale;
  records: ReviewRecord[];
  itemCount: number;
  unresolvedCount: number;
}

const SEGMENT = /([^.[\]]+)|\[(\d+)\]/g;

/**
 * Reads `content.kingdoms[0].name` out of a record. `reviewRequired` paths are
 * produced by the translator's own walker, so they use this bracket form
 * rather than a dotted index.
 */
// @req REQ-142
export function readAtPath(
  record: Record<string, unknown>,
  path: string
): unknown {
  let cursor: unknown = record;
  for (const match of path.matchAll(SEGMENT)) {
    if (cursor === null || cursor === undefined) return undefined;
    const [, key, index] = match;
    if (index !== undefined) {
      if (!Array.isArray(cursor)) return undefined;
      cursor = cursor[Number(index)];
    } else {
      if (typeof cursor !== "object" || Array.isArray(cursor)) return undefined;
      cursor = (cursor as Record<string, unknown>)[key];
    }
  }
  return cursor;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function blockOf(sidecar: Record<string, unknown>): TranslationBlock {
  const block = sidecar[TRANSLATION_BLOCK_KEY];
  if (!block || typeof block !== "object") {
    throw new Error("sidecar carries no _translation block");
  }
  return block as TranslationBlock;
}

// @req REQ-142
export function buildReviewPackage(
  subjects: ReviewSubject[],
  lang: TranslationLocale
): ReviewPackage {
  const records = subjects.map((subject) => {
    const block = blockOf(subject.sidecar);
    const items = block.reviewRequired.map((path) => {
      const french = readAtPath(subject.source, path);
      return {
        path,
        french: asText(french),
        english: asText(readAtPath(subject.sidecar, path)),
        unresolved: french === undefined,
      };
    });
    return {
      recordId: subject.recordId,
      sourceRelativePath: subject.sourceRelativePath,
      provenance: {
        kind: block.kind,
        model: block.model ?? null,
        translatedAt: block.translatedAt,
        reviewedBy: block.reviewedBy ?? null,
        sourceHash: block.sourceHash,
      },
      items,
    };
  });

  return {
    lang,
    records,
    itemCount: records.reduce(
      (total, record) => total + record.items.length,
      0
    ),
    unresolvedCount: records.reduce(
      (total, record) =>
        total + record.items.filter((item) => item.unresolved).length,
      0
    ),
  };
}

function quote(value: string | null): string {
  if (value === null) return "_(not a text field)_";
  return value.replace(/\n+/g, " ").trim();
}

// @req REQ-142
export function renderReviewPackage(pkg: ReviewPackage): string {
  const lines: string[] = [];
  lines.push(`# English review package — ${pkg.records.length} record(s)`);
  lines.push("");
  lines.push(
    `${pkg.itemCount} path(s) require a named reader before any of these records may be promoted out of \`machine\` provenance.`
  );
  if (pkg.unresolvedCount > 0) {
    lines.push("");
    lines.push(
      `**${pkg.unresolvedCount} path(s) are absent from the French source.** Those are a stale review list, not a translation to read — report them rather than approving them.`
    );
  }
  lines.push("");
  lines.push("Reviewer: _unnamed_ — fill in before signing any record off.");
  lines.push("");

  for (const record of pkg.records) {
    lines.push(`## ${record.recordId} — \`${record.sourceRelativePath}\``);
    lines.push("");
    lines.push(
      `Provenance: kind \`${record.provenance.kind}\`, model \`${record.provenance.model ?? "—"}\`, translated ${record.provenance.translatedAt}, reviewed by ${record.provenance.reviewedBy ?? "_nobody_"}.`
    );
    lines.push(`Source hash: \`${record.provenance.sourceHash}\``);
    lines.push("");

    for (const item of record.items) {
      lines.push(`### \`${item.path}\``);
      if (item.unresolved) {
        lines.push("");
        lines.push("> Absent from the French source.");
        lines.push("");
        continue;
      }
      lines.push("");
      lines.push(`- **FR** — ${quote(item.french)}`);
      lines.push(`- **${pkg.lang.toUpperCase()}** — ${quote(item.english)}`);
      lines.push("- [ ] approved  [ ] corrected  [ ] rejected");
      lines.push("");
    }
  }

  return lines.join("\n");
}

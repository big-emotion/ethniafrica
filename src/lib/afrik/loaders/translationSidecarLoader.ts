/**
 * Translation sidecar loader — reads dataset/translations/<lang>/** and
 * projects each sidecar onto one afrik_translations row (REQ-146, REQ-142).
 *
 * Git wins: the sidecar is the editorial truth and the row is its projection,
 * upserted on the primary key so a reload rewrites rather than duplicates.
 * The hashes are copied from the sidecar's own block — they say what the
 * translation was made from — and the current source fiche is read only to
 * *report* which records the French has moved under since.
 *
 * A sidecar whose source fiche is gone is refused rather than loaded: a
 * translation of nothing would be served over nothing.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { logger } from "@/lib/api/logger";
import { driftedPaths } from "@/lib/afrik/translations/hashing";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import {
  listTranslationSidecars,
  readTranslationSidecar,
} from "@/lib/afrik/translations/sidecarPaths";
import {
  ENTITY_TYPE_BY_CORPUS_DIRECTORY,
  modelForEntity,
  stripTranslationBlock,
  type TranslationBlock,
  type TranslationEntityType,
  type TranslationKind,
} from "@/lib/afrik/translations/types";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import type { createAdminClient } from "@/lib/supabase/admin";

const TRANSLATIONS_ROOT = join(process.cwd(), "dataset/translations");
const AFRIK_ROOT = join(process.cwd(), "dataset/source/afrik");

type AdminClient = ReturnType<typeof createAdminClient>;

/** The upsert size the other batch writers settled on (module-zero-batch). */
const UPSERT_CHUNK_SIZE = 500;

function chunk<T>(items: T[]): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += UPSERT_CHUNK_SIZE) {
    pages.push(items.slice(index, index + UPSERT_CHUNK_SIZE));
  }
  return pages;
}

/** One afrik_translations row, in the column vocabulary of migration 085. */
export interface TranslationRow {
  entity_type: TranslationEntityType;
  entity_id: string;
  lang: TranslationLocale;
  content: Record<string, unknown>;
  translation_kind: TranslationKind;
  translated_at: string;
  reviewed_by: string | null;
  model: string | null;
  source_hash: string;
  field_hashes: Record<string, string>;
  review_required: string[];
}

export interface TranslationSidecarBatch {
  rows: TranslationRow[];
  /** Sidecars that could not become rows, each naming its file. */
  errors: string[];
  /** `entity_type/entity_id` of records whose source moved since translation. */
  stale: string[];
}

export interface TranslationLoadReport {
  total: number;
  inserted: number;
  /** Set when the table is absent on this project; the stage then did nothing. */
  skipped: string | null;
  stale: string[];
  errors: string[];
}

// @req REQ-146
export const MISSING_TRANSLATIONS_TABLE_HINT =
  "afrik_translations is absent on this project — apply supabase/migrations/085_afrik_translations.sql, then rerun the sync; the stage was skipped";

// @req REQ-146
export function emptyTranslationLoadReport(): TranslationLoadReport {
  return { total: 0, inserted: 0, skipped: null, stale: [], errors: [] };
}

function readSourceFiche(file: string): Record<string, unknown> | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toRow(
  entityType: TranslationEntityType,
  entityId: string,
  lang: TranslationLocale,
  content: Record<string, unknown>,
  block: TranslationBlock
): TranslationRow {
  return {
    entity_type: entityType,
    entity_id: entityId,
    lang,
    content,
    translation_kind: block.kind,
    translated_at: block.translatedAt,
    reviewed_by: block.reviewedBy ?? null,
    model: block.model ?? null,
    source_hash: block.sourceHash,
    field_hashes: block.fieldHashes,
    review_required: block.reviewRequired,
  };
}

/**
 * Every sidecar of one locale as a row, with the ones that cannot be rows
 * named in `errors` — never thrown, so one bad file does not hide the others.
 */
// @req REQ-146
export function loadAllTranslationSidecars(
  lang: TranslationLocale,
  translationsRoot: string = TRANSLATIONS_ROOT,
  corpusRoot: string = AFRIK_ROOT
): TranslationSidecarBatch {
  const batch: TranslationSidecarBatch = { rows: [], errors: [], stale: [] };

  for (const relativePath of listTranslationSidecars(translationsRoot, lang)) {
    const sidecarFile = join(translationsRoot, lang, relativePath);
    const [directory] = relativePath.split("/");
    // Dossiers are sparse overlays served from git by lib/dossiers/corpus;
    // they predate this table and have their own validator and reader.
    if (directory === "dossiers") continue;
    const entityType = ENTITY_TYPE_BY_CORPUS_DIRECTORY[directory];
    if (!entityType) {
      batch.errors.push(
        `${relativePath}: ${directory}/ is not a corpus directory`
      );
      continue;
    }

    const source = readSourceFiche(join(corpusRoot, relativePath));
    if (!source) {
      batch.errors.push(`${relativePath}: no source fiche at that path`);
      continue;
    }

    let sidecar;
    try {
      sidecar = readTranslationSidecar(sidecarFile);
    } catch (error) {
      batch.errors.push(error instanceof Error ? error.message : String(error));
      continue;
    }

    const entityId = relativePath
      .split("/")
      .pop()!
      .replace(/\.json$/, "");
    const { block, content } = stripTranslationBlock(sidecar);
    const typedBlock = block as TranslationBlock;
    batch.rows.push(toRow(entityType, entityId, lang, content, typedBlock));

    const classify = classifierFor(modelForEntity(entityType, source));
    if (driftedPaths(source, typedBlock.fieldHashes, classify).length > 0) {
      batch.stale.push(`${entityType}/${entityId}`);
    }
  }

  return batch;
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  return (
    /afrik_translations/.test(error.message ?? "") &&
    /does not exist|could not find/i.test(error.message ?? "")
  );
}

/**
 * Upserts the rows in shared-size chunks. A missing table is a skip with a
 * warning, not a failure: the recette sync and migrate-recette.yml fire on
 * the same push, and a corpus load must not go red because one table is a
 * minute behind it.
 */
// @req REQ-146
export async function loadTranslationSidecars(
  supabase: AdminClient,
  rows: TranslationRow[]
): Promise<TranslationLoadReport> {
  const report = emptyTranslationLoadReport();
  report.total = rows.length;
  if (rows.length === 0) return report;

  for (const [index, batch] of chunk(rows).entries()) {
    const { error } = await supabase
      .from("afrik_translations")
      .upsert(batch, { onConflict: "entity_type,entity_id,lang" });

    if (!error) {
      report.inserted += batch.length;
      continue;
    }
    if (isMissingTable(error)) {
      report.skipped = MISSING_TRANSLATIONS_TABLE_HINT;
      logger.warn(MISSING_TRANSLATIONS_TABLE_HINT, { rows: rows.length });
      return report;
    }
    report.errors.push(`Batch ${index + 1}: ${error.message}`);
  }

  return report;
}

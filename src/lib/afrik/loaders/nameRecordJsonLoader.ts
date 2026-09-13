/**
 * Name-record JSON loader — reads dataset/source/afrik/noms/*.json and writes
 * each dossier's entries into sources, a placeholder fiche_revisions row,
 * assertions, and name_records (Module 0 fabric, FR57). See Epic 8 Story 8.5
 * (ETNI-469).
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import { logger } from "@/lib/api/logger";
import { normalizeToKey } from "@/lib/normalize";
import { parseNameRecordFile } from "@/lib/afrik/parsers/nameRecordParser";
import {
  findLatestOrCreatePlaceholderRevision,
  findOrCreateAssertion,
  supabaseErrorMessage,
  upsertSource,
} from "@/lib/afrik/loaders/provenanceWriter";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NameRecordDossier, NameRecordEntry } from "@/types/names";

const AFRIK_ROOT = join(process.cwd(), "dataset/source/afrik");

const PLACEHOLDER_REVISION_SNAPSHOT = {
  source: "nameRecordJsonLoader",
  note: "Placeholder revision for name-record assertions; dataset/source/afrik/noms/ is the canonical source, not a moderation-authored fiche revision.",
};

export type AdminClient = ReturnType<typeof createAdminClient>;

export interface NameRecordLoadReport {
  total: number;
  inserted: number;
  dropped: string[];
  errors: string[];
}

function createReport(): NameRecordLoadReport {
  return { total: 0, inserted: 0, dropped: [], errors: [] };
}

function isIllustrative(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { _meta?: { illustrative?: boolean } })._meta?.illustrative === true
  );
}

/**
 * Reads and parses every dataset/source/afrik/noms/*.json dossier, skipping
 * illustrative fixtures (nameRecordParser's _meta.illustrative contract) and
 * files that fail the strict model. `datasetRoot` is the AFRIK dataset root
 * (parent of `noms/`), matching the `collectNameRecordFiles` convention in
 * scripts/validateAfrikData.ts.
 */
// @req REQ-057
export function loadAllNameRecordDossiers(
  datasetRoot: string = AFRIK_ROOT
): NameRecordDossier[] {
  const nomsDir = join(datasetRoot, "noms");
  let files: string[];
  try {
    files = readdirSync(nomsDir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const dossiers: NameRecordDossier[] = [];
  for (const file of files) {
    const fullPath = join(nomsDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(fullPath, "utf-8"));
    } catch (error) {
      logger.error(`Failed to read name-record file ${file}`, error);
      continue;
    }

    if (isIllustrative(raw)) {
      continue;
    }

    const result = parseNameRecordFile(raw);
    if (!result.success || !result.data) {
      logger.error(`Failed to parse name-record file ${file}`, undefined, {
        errors: result.errors,
      });
      continue;
    }

    dossiers.push(result.data);
  }

  return dossiers;
}

async function upsertNameRecordEntry(
  supabase: AdminClient,
  entityType: NameRecordDossier["entityType"],
  entityId: string,
  entry: NameRecordEntry,
  report: NameRecordLoadReport
): Promise<void> {
  report.total += 1;
  const recordLabel = `${entityId}/${entry.nameType}/${entry.nameText}`;

  const sourceIds: string[] = [];
  for (const source of entry.sources) {
    const result = await upsertSource(supabase, {
      title: source.title,
      author: source.author,
      year: source.year,
      url: source.url,
      tier: source.tier,
      notes: source.notes ?? null,
    });
    if ("error" in result) {
      report.errors.push(
        `${recordLabel}: source "${source.title}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  // A noms/ dossier annotates an entity that owns its own revisions, so it
  // reuses the latest one across every name entry rather than publishing one.
  const ficheRevision = await findLatestOrCreatePlaceholderRevision(
    supabase,
    entityType,
    entityId,
    PLACEHOLDER_REVISION_SNAPSHOT
  );
  if ("error" in ficheRevision) {
    report.errors.push(
      `${recordLabel}: fiche_revisions — ${ficheRevision.error}`
    );
    return;
  }

  const assertion = await findOrCreateAssertion(supabase, {
    entityType,
    entityId,
    fieldPath: `names.${entry.nameType}.${normalizeToKey(entry.nameText)}`,
    statement: entry.nameText,
    sourceIds,
    ficheRevisionId: ficheRevision.id,
  });
  if ("error" in assertion) {
    report.errors.push(`${recordLabel}: assertion — ${assertion.error}`);
    return;
  }

  const { error: nameRecordError } = await supabase.from("name_records").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      name_text: entry.nameText,
      name_type: entry.nameType,
      language_of_origin: entry.languageOfOrigin,
      meaning: entry.meaning,
      period_label: entry.periodLabel,
      imposed_by: entry.imposedBy,
      imposition_period: entry.impositionPeriod,
      why_problematic: entry.whyProblematic,
      contemporary_usage: entry.contemporaryUsage,
      assertion_id: assertion.id,
      sort_rank: entry.sortRank,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entity_type,entity_id,name_text,name_type" }
  );

  if (nameRecordError) {
    const reason = supabaseErrorMessage(nameRecordError);
    logger.warn(`name_records row rejected for ${recordLabel}`, { reason });
    report.dropped.push(`${recordLabel}: ${reason}`);
    return;
  }

  report.inserted += 1;
}

/**
 * Loads every non-illustrative dataset/source/afrik/noms/*.json dossier and
 * writes sources → assertions → name_records for each entry (FR57, Module 0
 * fabric). Trigger rejections (sourceless assertions, defense in depth) are
 * logged and skipped; remaining records still load.
 */
// @req REQ-057
export async function loadNameRecords(
  supabase: AdminClient,
  dossiers: NameRecordDossier[] = loadAllNameRecordDossiers()
): Promise<NameRecordLoadReport> {
  const report = createReport();

  for (const dossier of dossiers) {
    for (const entry of dossier.names) {
      await upsertNameRecordEntry(
        supabase,
        dossier.entityType,
        dossier.id,
        entry,
        report
      );
    }
  }

  return report;
}

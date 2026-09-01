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
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  NameRecordDossier,
  NameRecordEntry,
  NameRecordSource,
} from "@/types/names";

const AFRIK_ROOT = join(process.cwd(), "dataset/source/afrik");

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

function errorMessage(value: { message: string } | null | undefined): string {
  return value?.message ?? "unknown Supabase error";
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

async function upsertSource(
  supabase: AdminClient,
  source: NameRecordSource
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      {
        title: source.title,
        author: source.author,
        year: source.year,
        url: source.url,
        tier: source.tier,
        notes: source.notes ?? null,
        added_at: new Date().toISOString(),
      },
      { onConflict: "title" }
    )
    .select("id")
    .single();

  if (error || !data) {
    return { error: errorMessage(error) };
  }
  return { id: data.id as string };
}

/**
 * `assertions.fiche_revision_id` is a NOT NULL FK to `fiche_revisions`
 * (migration 020) — every assertion has to be anchored to a published
 * snapshot. The moderation pipeline (migration 051) creates that snapshot
 * as part of publishing a reviewed revision; a noms/ dossier has no such
 * revision, so this loader stands up a single placeholder `fiche_revisions`
 * row per entity (version 1) and reuses it across every name entry in that
 * entity's dossier — same find-or-create shape as `findOrCreateAssertion`.
 */
async function findOrCreateFicheRevision(
  supabase: AdminClient,
  entityType: NameRecordDossier["entityType"],
  entityId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("fiche_revisions")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    return { error: errorMessage(selectError) };
  }
  if (existing) {
    return { id: existing.id as string };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("fiche_revisions")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      version: 1,
      content_snapshot: {
        source: "nameRecordJsonLoader",
        note: "Placeholder revision for name-record assertions; dataset/source/afrik/noms/ is the canonical source, not a moderation-authored fiche revision.",
      },
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: errorMessage(insertError) };
  }
  return { id: inserted.id as string };
}

/**
 * assertions has no unique constraint on (entity_type, entity_id,
 * field_path), so idempotency on re-run is enforced here via
 * select-before-write rather than a database guarantee.
 */
async function findOrCreateAssertion(
  supabase: AdminClient,
  entityType: NameRecordDossier["entityType"],
  entityId: string,
  fieldPath: string,
  statement: string,
  sourceIds: string[],
  ficheRevisionId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("assertions")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("field_path", fieldPath)
    .maybeSingle();

  if (selectError) {
    return { error: errorMessage(selectError) };
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("assertions")
      .update({ statement, source_ids: sourceIds })
      .eq("id", existing.id);

    if (updateError) {
      return { error: errorMessage(updateError) };
    }
    return { id: existing.id as string };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("assertions")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      field_path: fieldPath,
      statement,
      source_ids: sourceIds,
      fiche_revision_id: ficheRevisionId,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: errorMessage(insertError) };
  }
  return { id: inserted.id as string };
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
    const result = await upsertSource(supabase, source);
    if ("error" in result) {
      report.errors.push(
        `${recordLabel}: source "${source.title}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  const ficheRevision = await findOrCreateFicheRevision(
    supabase,
    entityType,
    entityId
  );
  if ("error" in ficheRevision) {
    report.errors.push(
      `${recordLabel}: fiche_revisions — ${ficheRevision.error}`
    );
    return;
  }

  const fieldPath = `names.${entry.nameType}.${normalizeToKey(entry.nameText)}`;
  const assertion = await findOrCreateAssertion(
    supabase,
    entityType,
    entityId,
    fieldPath,
    entry.nameText,
    sourceIds,
    ficheRevision.id
  );
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
    const reason = errorMessage(nameRecordError);
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

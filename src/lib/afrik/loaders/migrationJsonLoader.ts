/**
 * Migration JSON loader — reads dataset/source/afrik/migrations/*.json and
 * writes each record into migration_events + migration_event_peoples,
 * sources, and one assertion row (entity_type='migration',
 * field_path='record'), then seeds confidence_scores via
 * recompute_confidence. See Epic 12 Story 12.4 (ETNI-517, FR80, AR15/AR17).
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import { logger } from "@/lib/api/logger";
import { parseMigrationFile } from "@/lib/afrik/parsers/migrationParser";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MigrationRecord, MigrationSource } from "@/types/migrations";

const AFRIK_ROOT = join(process.cwd(), "dataset/source/afrik");

export type AdminClient = ReturnType<typeof createAdminClient>;

export interface MigrationLoadReport {
  total: number;
  inserted: number;
  errors: string[];
}

function createReport(): MigrationLoadReport {
  return { total: 0, inserted: 0, errors: [] };
}

function errorMessage(value: { message: string } | null | undefined): string {
  return value?.message ?? "unknown Supabase error";
}

/**
 * Derives migration_events.slug from the MGR_ id (kebab-case, prefix
 * stripped) — the strict model carries no slug field of its own, and the
 * user-facing route slug is Story 12.8 scope.
 */
function slugFromId(id: string): string {
  return id.replace(/^MGR_/, "").toLowerCase().replace(/_/g, "-");
}

/**
 * Reads and parses every dataset/source/afrik/migrations/*.json file,
 * skipping files that fail the strict model (migrationSchema via
 * parseMigrationFile — see scripts/validateAfrikData.ts FR80).
 */
export function loadAllMigrationFiles(
  datasetRoot: string = AFRIK_ROOT
): MigrationRecord[] {
  const migrationsDir = join(datasetRoot, "migrations");
  let files: string[];
  try {
    files = readdirSync(migrationsDir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const migrations: MigrationRecord[] = [];
  for (const file of files) {
    const fullPath = join(migrationsDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(fullPath, "utf-8"));
    } catch (error) {
      logger.error(`Failed to read migration file ${file}`, error);
      continue;
    }

    const result = parseMigrationFile(raw);
    if (!result.success || !result.data) {
      logger.error(`Failed to parse migration file ${file}`, undefined, {
        errors: result.errors,
      });
      continue;
    }

    migrations.push(result.data);
  }

  return migrations;
}

async function upsertSource(
  supabase: AdminClient,
  source: MigrationSource
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      {
        title: source.title,
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
 * Migration 020 made `assertions.fiche_revision_id` a NOT NULL FK so every
 * assertion is traceable to a published snapshot (R-2 / ASR-4), and seeded
 * version-1 placeholder revisions for the assertions that already existed.
 * Nothing then taught the loaders to create one, so every assertion insert
 * failed against a real database. This publishes the fiche as version 1,
 * following that same precedent; the unique key (entity_type, entity_id,
 * version) makes the upsert idempotent across re-runs.
 */
async function findOrCreateFicheRevision(
  supabase: AdminClient,
  migration: MigrationRecord
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("fiche_revisions")
    .upsert(
      {
        entity_type: "migration",
        entity_id: migration.id,
        version: 1,
        content_snapshot: migration,
      },
      { onConflict: "entity_type,entity_id,version" }
    )
    .select("id")
    .single();

  if (error || !data) {
    return { error: errorMessage(error) };
  }
  return { id: data.id as string };
}

/**
 * assertions has no unique constraint on (entity_type, entity_id,
 * field_path), so idempotency on re-run is enforced here via
 * select-before-write rather than a database guarantee.
 */
async function findOrCreateAssertion(
  supabase: AdminClient,
  migrationId: string,
  statement: string,
  sourceIds: string[],
  ficheRevisionId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("assertions")
    .select("id")
    .eq("entity_type", "migration")
    .eq("entity_id", migrationId)
    .eq("field_path", "record")
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
      entity_type: "migration",
      entity_id: migrationId,
      field_path: "record",
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

/**
 * migration_event_peoples has no per-row identity beyond the composite PK,
 * so idempotency (including role changes and removed peoples) is enforced
 * by fully replacing the child rows for this migration on every load.
 */
async function replaceMigrationPeoples(
  supabase: AdminClient,
  migrationId: string,
  peoples: MigrationRecord["peoplesInvolved"]
): Promise<{ error: string } | null> {
  const { error: deleteError } = await supabase
    .from("migration_event_peoples")
    .delete()
    .eq("migration_id", migrationId);

  if (deleteError) {
    return { error: errorMessage(deleteError) };
  }

  if (peoples.length === 0) {
    return null;
  }

  const { error: insertError } = await supabase
    .from("migration_event_peoples")
    .insert(
      peoples.map((people) => ({
        migration_id: migrationId,
        people_id: people.id,
        role: people.role ?? null,
      }))
    );

  if (insertError) {
    return { error: errorMessage(insertError) };
  }
  return null;
}

async function upsertMigrationRecord(
  supabase: AdminClient,
  migration: MigrationRecord,
  report: MigrationLoadReport
): Promise<void> {
  report.total += 1;

  const sourceIds: string[] = [];
  for (const source of migration.content.sources) {
    const result = await upsertSource(supabase, source);
    if ("error" in result) {
      report.errors.push(
        `${migration.id}: source "${source.title}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  const revision = await findOrCreateFicheRevision(supabase, migration);
  if ("error" in revision) {
    report.errors.push(`${migration.id}: fiche revision — ${revision.error}`);
    return;
  }

  const assertion = await findOrCreateAssertion(
    supabase,
    migration.id,
    migration.content.summary,
    sourceIds,
    revision.id
  );
  if ("error" in assertion) {
    report.errors.push(`${migration.id}: assertion — ${assertion.error}`);
    return;
  }

  const { error: eventError } = await supabase.from("migration_events").upsert(
    {
      id: migration.id,
      slug: slugFromId(migration.id),
      name: migration.nameMain,
      migration_group: migration.migrationGroup ?? null,
      event_type: migration.eventType,
      classification_status: migration.classificationStatus,
      time_start_year: migration.timeRange.startYear,
      time_end_year: migration.timeRange.endYear,
      dating_note: migration.timeRange.datingNote ?? null,
      geometry_geojson: migration.geometry,
      summary: migration.content.summary,
      narrative: migration.content.narrative,
      debate: migration.content.debate ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (eventError) {
    report.errors.push(`${migration.id}: ${errorMessage(eventError)}`);
    return;
  }

  const peoplesResult = await replaceMigrationPeoples(
    supabase,
    migration.id,
    migration.peoplesInvolved
  );
  if (peoplesResult) {
    report.errors.push(`${migration.id}: peoples — ${peoplesResult.error}`);
    return;
  }

  report.inserted += 1;

  // recompute_confidence is fully polymorphic across entity types (see
  // supabase/migrations/035_migration_events.sql §6 fabric audit) — no
  // automatic per-INSERT trigger exists, so the loader seeds
  // confidence_scores explicitly. A failure here does not roll back the
  // event write; it is logged so a human can re-run the recompute job.
  const { error: confidenceError } = await supabase.rpc(
    "recompute_confidence",
    { p_entity_type: "migration", p_entity_id: migration.id }
  );
  if (confidenceError) {
    logger.warn(`recompute_confidence failed for ${migration.id}`, {
      reason: errorMessage(confidenceError),
    });
  }
}

/**
 * Loads every dataset/source/afrik/migrations/*.json record and writes
 * sources → assertions → migration_events → migration_event_peoples for
 * each, seeding confidence_scores via recompute_confidence (FR80,
 * AR15/AR17).
 */
export async function loadMigrations(
  supabase: AdminClient,
  migrations: MigrationRecord[] = loadAllMigrationFiles()
): Promise<MigrationLoadReport> {
  const report = createReport();

  for (const migration of migrations) {
    await upsertMigrationRecord(supabase, migration, report);
  }

  return report;
}

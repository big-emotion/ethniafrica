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
import {
  findOrCreateAssertion,
  reseedConfidence,
  supabaseErrorMessage,
  upsertSource,
  upsertVersionOneRevision,
} from "@/lib/afrik/loaders/provenanceWriter";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MigrationRecord } from "@/types/migrations";

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
// @req REQ-080
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
    return { error: supabaseErrorMessage(deleteError) };
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
    return { error: supabaseErrorMessage(insertError) };
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
    // The migration model carries no author, so none is sent: an upsert would
    // otherwise null the author another model recorded for the same title.
    const result = await upsertSource(supabase, {
      title: source.title,
      year: source.year,
      url: source.url,
      tier: source.tier,
      notes: source.notes ?? null,
    });
    if ("error" in result) {
      report.errors.push(
        `${migration.id}: source "${source.title}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  const revision = await upsertVersionOneRevision(supabase, {
    entityType: "migration",
    entityId: migration.id,
    snapshot: migration,
  });
  if ("error" in revision) {
    report.errors.push(`${migration.id}: fiche revision — ${revision.error}`);
    return;
  }

  const assertion = await findOrCreateAssertion(supabase, {
    entityType: "migration",
    entityId: migration.id,
    fieldPath: "record",
    statement: migration.content.summary,
    sourceIds,
    ficheRevisionId: revision.id,
  });
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
    report.errors.push(`${migration.id}: ${supabaseErrorMessage(eventError)}`);
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

  // Reseeded only once the event and its peoples exist (see migration 035 §6).
  await reseedConfidence(supabase, "migration", migration.id);
}

/**
 * Loads every dataset/source/afrik/migrations/*.json record and writes
 * sources → assertions → migration_events → migration_event_peoples for
 * each, seeding confidence_scores via recompute_confidence (FR80,
 * AR15/AR17).
 */
// @req REQ-080
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

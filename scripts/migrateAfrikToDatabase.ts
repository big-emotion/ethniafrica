/**
 * Synchronize canonical AFRIK JSON sources to a guarded Supabase target.
 *
 * Data is processed in AFRIK hierarchy order:
 * language families → peoples → countries → people/country relations →
 * migration events (peoples must exist first — migration_event_peoples FKs
 * afrik_peoples).
 */

import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { logger } from "@/lib/api/logger";
import { loadAllCountries } from "@/lib/afrik/loaders/countryLoader";
import { loadAllLanguageFamilies } from "@/lib/afrik/loaders/languageFamilyLoader";
import { loadAllPeoples } from "@/lib/afrik/loaders/peopleLoader";
import { loadNameRecords } from "@/lib/afrik/loaders/nameRecordJsonLoader";
import {
  loadAllRelationFiles,
  loadRelations,
} from "@/lib/afrik/loaders/relationJsonLoader";
import {
  loadAllMigrationFiles,
  loadMigrations,
} from "@/lib/afrik/loaders/migrationJsonLoader";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Country, LanguageFamily, People } from "@/types/afrik";
import type { RelationRecord } from "@/types/relations";
import {
  compareAfrikDrift,
  type AfrikContentRecord,
  type AfrikContentSnapshot,
  type AfrikDriftReport,
} from "./lib/afrikDrift";
import {
  validateAfrikMigrationTarget,
  type AfrikMigrationTargetInput,
} from "./lib/afrikMigrationTarget";

interface MigrationSectionReport {
  total: number;
  inserted: number;
  errors: string[];
}

export interface PeopleRelationsSectionReport extends MigrationSectionReport {
  orphans: string[];
}

export interface MigrationReport {
  languageFamilies: MigrationSectionReport;
  peoples: MigrationSectionReport;
  countries: MigrationSectionReport;
  relations: MigrationSectionReport;
  peopleRelations: PeopleRelationsSectionReport;
  migrations: MigrationSectionReport;
  names: MigrationSectionReport;
  verification: {
    before: AfrikDriftReport;
    after: AfrikDriftReport | null;
    errors: string[];
  };
}

export interface MigrationOptions {
  dryRun?: boolean;
  target: AfrikMigrationTargetInput;
  writeErrorReport?: boolean;
}

type AdminClient = ReturnType<typeof createAdminClient>;
type AfrikTable =
  | "afrik_language_families"
  | "afrik_peoples"
  | "afrik_countries";

function emptyDriftReport(): AfrikDriftReport {
  return {
    languageFamilies: { missing: [], stale: [] },
    peoples: { missing: [], stale: [] },
    countries: { missing: [], stale: [] },
    hasDrift: false,
  };
}

function createMigrationReport(): MigrationReport {
  return {
    languageFamilies: { total: 0, inserted: 0, errors: [] },
    peoples: { total: 0, inserted: 0, errors: [] },
    countries: { total: 0, inserted: 0, errors: [] },
    relations: { total: 0, inserted: 0, errors: [] },
    peopleRelations: { total: 0, inserted: 0, errors: [], orphans: [] },
    migrations: { total: 0, inserted: 0, errors: [] },
    names: { total: 0, inserted: 0, errors: [] },
    verification: {
      before: emptyDriftReport(),
      after: null,
      errors: [],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toContentRecords(data: unknown): AfrikContentRecord[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((row) => {
    if (!isRecord(row) || typeof row.id !== "string") {
      return [];
    }

    return [{ id: row.id, content: row.content }];
  });
}

function toIds(data: unknown): string[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((row) =>
    isRecord(row) && typeof row.id === "string" ? [row.id] : []
  );
}

function sourceSnapshot(
  languageFamilies: LanguageFamily[],
  peoples: People[],
  countries: Country[]
): AfrikContentSnapshot {
  return {
    languageFamilies: languageFamilies.map(({ id, content }) => ({
      id,
      content,
    })),
    peoples: peoples.map(({ id, content }) => ({ id, content })),
    countries: countries.map(({ id, content }) => ({ id, content })),
  };
}

async function readContentTable(
  supabase: AdminClient,
  table: AfrikTable
): Promise<AfrikContentRecord[]> {
  const { data, error } = await supabase.from(table).select("id, content");

  if (error) {
    throw new Error(`Failed to read ${table}: ${error.message}`);
  }

  return toContentRecords(data);
}

async function readIds(
  supabase: AdminClient,
  table: AfrikTable
): Promise<Set<string>> {
  const { data, error } = await supabase.from(table).select("id");

  if (error) {
    throw new Error(`Failed to read ${table} identifiers: ${error.message}`);
  }

  return new Set(toIds(data));
}

async function databaseSnapshot(
  supabase: AdminClient
): Promise<AfrikContentSnapshot> {
  const languageFamilies = await readContentTable(
    supabase,
    "afrik_language_families"
  );
  const peoples = await readContentTable(supabase, "afrik_peoples");
  const countries = await readContentTable(supabase, "afrik_countries");

  return { languageFamilies, peoples, countries };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function upsertLanguageFamilies(
  supabase: AdminClient,
  languageFamilies: LanguageFamily[],
  report: MigrationReport
): Promise<void> {
  for (const family of languageFamilies) {
    try {
      const { error } = await supabase.from("afrik_language_families").upsert(
        {
          id: family.id,
          name_fr: family.nameFr,
          name_en: family.nameEn ?? null,
          classification_status: family.classificationStatus ?? null,
          content: family.content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (error) {
        report.languageFamilies.errors.push(`${family.id}: ${error.message}`);
      } else {
        report.languageFamilies.inserted += 1;
      }
    } catch (error) {
      report.languageFamilies.errors.push(
        `${family.id}: ${errorMessage(error)}`
      );
    }
  }
}

async function upsertPeoples(
  supabase: AdminClient,
  peoples: People[],
  validFamilyIds: Set<string>,
  report: MigrationReport
): Promise<void> {
  for (const people of peoples) {
    if (!validFamilyIds.has(people.languageFamilyId)) {
      report.peoples.errors.push(
        `${people.id}: Language family ${people.languageFamilyId} does not exist in database`
      );
      continue;
    }

    try {
      const { error } = await supabase.from("afrik_peoples").upsert(
        {
          id: people.id,
          name_main: people.nameMain,
          language_family_id: people.languageFamilyId,
          classification_status: people.classificationStatus ?? null,
          content: people.content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (error) {
        report.peoples.errors.push(`${people.id}: ${error.message}`);
      } else {
        report.peoples.inserted += 1;
      }
    } catch (error) {
      report.peoples.errors.push(`${people.id}: ${errorMessage(error)}`);
    }
  }
}

async function upsertCountries(
  supabase: AdminClient,
  countries: Country[],
  report: MigrationReport
): Promise<void> {
  for (const country of countries) {
    try {
      const { error } = await supabase.from("afrik_countries").upsert(
        {
          id: country.id,
          name_fr: country.nameFr,
          etymology: country.etymology ?? null,
          name_origin_actor: country.nameOriginActor ?? null,
          content: country.content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (error) {
        report.countries.errors.push(`${country.id}: ${error.message}`);
      } else {
        report.countries.inserted += 1;
      }
    } catch (error) {
      report.countries.errors.push(`${country.id}: ${errorMessage(error)}`);
    }
  }
}

async function upsertRelations(
  supabase: AdminClient,
  peoples: People[],
  validCountryIds: Set<string>,
  report: MigrationReport
): Promise<void> {
  for (const people of peoples) {
    for (const countryId of people.currentCountries ?? []) {
      if (!countryId) {
        continue;
      }

      report.relations.total += 1;

      if (!validCountryIds.has(countryId)) {
        continue;
      }

      try {
        const { error } = await supabase.from("afrik_people_countries").upsert(
          {
            people_id: people.id,
            country_id: countryId,
          },
          { onConflict: "people_id,country_id" }
        );

        if (error) {
          report.relations.errors.push(
            `${people.id} ↔ ${countryId}: ${error.message}`
          );
        } else {
          report.relations.inserted += 1;
        }
      } catch (error) {
        report.relations.errors.push(
          `${people.id} ↔ ${countryId}: ${errorMessage(error)}`
        );
      }
    }
  }
}

/**
 * Report-only orphan detection (MVP, ETNI-506): a relation present in
 * afrik_people_relations but absent from the current source tree means it
 * was deleted from dataset/source/afrik/relations/ without a corresponding
 * DELETE being applied to the database. Flagged for human review, never
 * deleted automatically.
 */
async function detectRelationOrphans(
  supabase: AdminClient,
  sourceRelations: RelationRecord[]
): Promise<string[]> {
  const sourceIds = new Set(sourceRelations.map((relation) => relation.id));
  const { data, error } = await supabase
    .from("afrik_people_relations")
    .select("id");

  if (error) {
    throw new Error(
      `Failed to read afrik_people_relations identifiers: ${error.message}`
    );
  }

  const orphans = toIds(data).filter((id) => !sourceIds.has(id));
  if (orphans.length > 0) {
    logger.warn(
      "Relation(s) found in database with no matching source file (report-only, ETNI-506)",
      { orphans }
    );
  }

  return orphans;
}

function countRelations(peoples: People[]): number {
  return peoples.reduce(
    (total, people) =>
      total + (people.currentCountries ?? []).filter(Boolean).length,
    0
  );
}

function hasErrors(report: MigrationReport): boolean {
  return (
    report.languageFamilies.errors.length > 0 ||
    report.peoples.errors.length > 0 ||
    report.countries.errors.length > 0 ||
    report.relations.errors.length > 0 ||
    report.peopleRelations.errors.length > 0 ||
    report.migrations.errors.length > 0 ||
    report.names.errors.length > 0 ||
    report.verification.errors.length > 0
  );
}

function saveErrorReport(report: MigrationReport): string {
  const logsDir = join(process.cwd(), "dataset", "source", "afrik", "logs");
  mkdirSync(logsDir, { recursive: true });
  const errorFile = join(
    logsDir,
    `migration_errors_${new Date().toISOString().split("T")[0]}.json`
  );
  writeFileSync(errorFile, JSON.stringify(report, null, 2), "utf-8");
  return errorFile;
}

/**
 * Preview or apply canonical AFRIK data synchronization.
 */
export async function migrateAfrikToDatabase(
  options: MigrationOptions
): Promise<MigrationReport> {
  const validatedTarget = validateAfrikMigrationTarget(options.target);

  const dryRun = options.dryRun ?? true;
  const writeErrorReport = options.writeErrorReport ?? true;
  const supabase = createAdminClient();
  const report = createMigrationReport();

  const languageFamilies = await loadAllLanguageFamilies();
  report.languageFamilies.total = languageFamilies.length;

  const peoples = await loadAllPeoples();
  report.peoples.total = peoples.length;

  const countries = await loadAllCountries();
  report.countries.total = countries.length;

  const sources = sourceSnapshot(languageFamilies, peoples, countries);
  report.verification.before = compareAfrikDrift(
    sources,
    await databaseSnapshot(supabase)
  );

  if (dryRun) {
    report.relations.total = countRelations(peoples);
    report.peopleRelations.total = loadAllRelationFiles().length;
    report.migrations.total = loadAllMigrationFiles().length;
    logger.info("AFRIK synchronization preview completed", {
      target: validatedTarget.target,
      languageFamilies: report.languageFamilies.total,
      peoples: report.peoples.total,
      countries: report.countries.total,
      relations: report.relations.total,
      peopleRelations: report.peopleRelations.total,
      migrations: report.migrations.total,
      drift: report.verification.before,
    });
    return report;
  }

  await upsertLanguageFamilies(supabase, languageFamilies, report);
  const validFamilyIds = await readIds(supabase, "afrik_language_families");

  await upsertPeoples(supabase, peoples, validFamilyIds, report);

  const migrationRecords = loadAllMigrationFiles();
  const migrationsReport = await loadMigrations(supabase, migrationRecords);
  report.migrations.total = migrationsReport.total;
  report.migrations.inserted = migrationsReport.inserted;
  report.migrations.errors = migrationsReport.errors;

  const namesReport = await loadNameRecords(supabase);
  report.names.total = namesReport.total;
  report.names.inserted = namesReport.inserted;
  report.names.errors = [...namesReport.errors, ...namesReport.dropped];

  const peopleRelationRecords = loadAllRelationFiles();
  const peopleRelationsReport = await loadRelations(
    supabase,
    peopleRelationRecords
  );
  report.peopleRelations.total = peopleRelationsReport.total;
  report.peopleRelations.inserted = peopleRelationsReport.inserted;
  report.peopleRelations.errors = peopleRelationsReport.errors;
  report.peopleRelations.orphans = await detectRelationOrphans(
    supabase,
    peopleRelationRecords
  );

  await upsertCountries(supabase, countries, report);
  const validCountryIds = await readIds(supabase, "afrik_countries");

  await upsertRelations(supabase, peoples, validCountryIds, report);

  report.verification.after = compareAfrikDrift(
    sources,
    await databaseSnapshot(supabase)
  );
  if (report.verification.after.hasDrift) {
    report.verification.errors.push(
      "Post-sync verification found residual AFRIK source drift"
    );
  }

  if (hasErrors(report) && writeErrorReport) {
    logger.warn("AFRIK synchronization completed with errors", {
      errorReport: saveErrorReport(report),
    });
  } else {
    logger.info("AFRIK synchronization completed", {
      target: validatedTarget.target,
      languageFamilies: report.languageFamilies,
      peoples: report.peoples,
      countries: report.countries,
      relations: report.relations,
      peopleRelations: report.peopleRelations,
      migrations: report.migrations,
      names: report.names,
      driftBefore: report.verification.before,
      driftAfter: report.verification.after,
    });
  }

  return report;
}

function cliTarget(args: string[]): string | undefined {
  const targetArgument = args.find((argument) =>
    argument.startsWith("--target=")
  );
  return targetArgument?.slice("--target=".length);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");

  migrateAfrikToDatabase({
    dryRun,
    target: {
      target: cliTarget(args),
      activeSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      expectedStagingSupabaseUrl: process.env.AFRIK_STAGING_SUPABASE_URL,
    },
  })
    .then((report) => {
      process.exitCode = hasErrors(report) ? 1 : 0;
    })
    .catch((error) => {
      logger.error("AFRIK synchronization failed", error);
      process.exitCode = 1;
    });
}

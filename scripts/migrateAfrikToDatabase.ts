/**
 * Synchronize canonical AFRIK JSON sources to a guarded Supabase target.
 *
 * Data is processed in AFRIK hierarchy order:
 * language families → languages → peoples → people/language relations →
 * countries → people/country relations → migration events (peoples must
 * exist first — migration_event_peoples FKs afrik_peoples).
 */

import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { logger } from "@/lib/api/logger";
import { loadAllCountries } from "@/lib/afrik/loaders/countryLoader";
import { loadAllLanguageFamilies } from "@/lib/afrik/loaders/languageFamilyLoader";
import { loadAllLanguages } from "@/lib/afrik/loaders/languageCsvLoader";
import type { LanguageRecord } from "@/lib/afrik/loaders/languageCsvLoader";
import {
  loadLanguages,
  emptyLanguageLoadReport,
  type LanguageLoadReport,
} from "@/lib/afrik/loaders/languageProvenanceLoader";
import { loadAllPeoples } from "@/lib/afrik/loaders/peopleLoader";
import { loadNameRecords } from "@/lib/afrik/loaders/nameRecordJsonLoader";
import {
  loadPeopleAppellations,
  emptyAppellationLoadReport,
  type AppellationLoadReport,
} from "@/lib/afrik/loaders/peopleAppellationLoader";
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
  resolveAfrikSyncTarget,
  type AfrikSyncTargetInput,
} from "./lib/afrikSyncTarget";
import { scanCorpusOrphans } from "./lib/afrikCorpusOrphans";
import { chunk, fetchAllPages } from "./lib/supabasePaging";

interface MigrationSectionReport {
  total: number;
  inserted: number;
  errors: string[];
}

export interface PeopleRelationsSectionReport extends MigrationSectionReport {
  orphans: string[];
}

export interface ProtectedClassificationDrift {
  id: string;
  field: "classification_status";
  databaseStatus: unknown;
  sourceStatus: unknown;
}

/**
 * What a fiche deleted from the corpus left behind in one table, and whether
 * the sync was willing to remove it. `refusal` outranks `orphans`: a populated
 * list with a refusal means "found, not touched, look at this by hand".
 */
export interface CorpusOrphanReport {
  orphans: string[];
  refusal: string | null;
  deleted: number;
}

export interface MigrationReport {
  languageFamilies: MigrationSectionReport;
  languages: LanguageLoadReport;
  peoples: MigrationSectionReport;
  peopleLanguages: MigrationSectionReport;
  countries: MigrationSectionReport;
  relations: MigrationSectionReport;
  peopleRelations: PeopleRelationsSectionReport;
  migrations: MigrationSectionReport;
  names: MigrationSectionReport;
  appellations: AppellationLoadReport;
  protectedDrift: {
    languageFamilies: ProtectedClassificationDrift[];
    peoples: ProtectedClassificationDrift[];
  };
  corpusOrphans: Record<AfrikTable, CorpusOrphanReport>;
  verification: {
    before: AfrikDriftReport;
    after: AfrikDriftReport | null;
    errors: string[];
  };
}

export interface MigrationOptions {
  dryRun?: boolean;
  target: AfrikSyncTargetInput;
  writeErrorReport?: boolean;
  /**
   * Delete rows the corpus no longer declares. Opt-in, and inert without
   * `--apply`: the scan always runs and always reports, but nothing is
   * removed unless a human asked for removal on this particular run.
   */
  prune?: boolean;
}

type AdminClient = ReturnType<typeof createAdminClient>;
type AfrikTable =
  | "afrik_language_families"
  | "afrik_peoples"
  | "afrik_countries";
type ClassifiedAfrikTable = "afrik_language_families" | "afrik_peoples";

function emptyDriftReport(): AfrikDriftReport {
  return {
    languageFamilies: { missing: [], stale: [] },
    peoples: { missing: [], stale: [] },
    countries: { missing: [], stale: [] },
    hasDrift: false,
  };
}

function emptyOrphanReport(): CorpusOrphanReport {
  return { orphans: [], refusal: null, deleted: 0 };
}

function createMigrationReport(): MigrationReport {
  return {
    languageFamilies: { total: 0, inserted: 0, errors: [] },
    languages: emptyLanguageLoadReport(),
    peoples: { total: 0, inserted: 0, errors: [] },
    peopleLanguages: { total: 0, inserted: 0, errors: [] },
    countries: { total: 0, inserted: 0, errors: [] },
    relations: { total: 0, inserted: 0, errors: [] },
    peopleRelations: { total: 0, inserted: 0, errors: [], orphans: [] },
    migrations: { total: 0, inserted: 0, errors: [] },
    names: { total: 0, inserted: 0, errors: [] },
    appellations: emptyAppellationLoadReport(),
    protectedDrift: { languageFamilies: [], peoples: [] },
    corpusOrphans: {
      afrik_language_families: emptyOrphanReport(),
      afrik_peoples: emptyOrphanReport(),
      afrik_countries: emptyOrphanReport(),
    },
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

async function readClassificationStatuses(
  supabase: AdminClient,
  table: ClassifiedAfrikTable
): Promise<Map<string, unknown>> {
  const { data, error } = await supabase
    .from(table)
    .select("id, classification_status");

  if (error) {
    throw new Error(
      `Failed to read ${table} classification statuses: ${error.message}`
    );
  }

  const statuses = new Map<string, unknown>();
  if (!Array.isArray(data)) {
    return statuses;
  }

  for (const row of data) {
    if (isRecord(row) && typeof row.id === "string") {
      statuses.set(row.id, row.classification_status ?? null);
    }
  }
  return statuses;
}

function findProtectedClassificationDrift(
  records: Array<{ id: string; classificationStatus?: unknown }>,
  existingStatuses: Map<string, unknown>
): ProtectedClassificationDrift[] {
  return records.flatMap((record) => {
    if (!existingStatuses.has(record.id)) {
      return [];
    }

    const sourceStatus = record.classificationStatus ?? null;
    const databaseStatus = existingStatuses.get(record.id);
    if (sourceStatus === databaseStatus) {
      return [];
    }

    return [
      {
        id: record.id,
        field: "classification_status" as const,
        databaseStatus,
        sourceStatus,
      },
    ];
  });
}

async function upsertLanguageFamilies(
  supabase: AdminClient,
  languageFamilies: LanguageFamily[],
  existingStatuses: Map<string, unknown>,
  report: MigrationReport
): Promise<void> {
  for (const family of languageFamilies) {
    const classificationStatus = family.classificationStatus ?? null;
    const exists = existingStatuses.has(family.id);
    try {
      const { error } = await supabase.from("afrik_language_families").upsert(
        {
          id: family.id,
          name_fr: family.nameFr,
          name_en: family.nameEn ?? null,
          ...(exists ? {} : { classification_status: classificationStatus }),
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
  existingStatuses: Map<string, unknown>,
  report: MigrationReport
): Promise<void> {
  for (const people of peoples) {
    if (!validFamilyIds.has(people.languageFamilyId)) {
      report.peoples.errors.push(
        `${people.id}: Language family ${people.languageFamilyId} does not exist in database`
      );
      continue;
    }

    const classificationStatus = people.classificationStatus ?? null;
    const exists = existingStatuses.has(people.id);
    try {
      const { error } = await supabase.from("afrik_peoples").upsert(
        {
          id: people.id,
          name_main: people.nameMain,
          language_family_id: people.languageFamilyId,
          ...(exists ? {} : { classification_status: classificationStatus }),
          content: people.content,
          spelling_aliases: people.content.appellations?.spellingAliases ?? [],
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
          // Unmapped fields do not error here, they simply never arrive —
          // which is how the chapeau could have stayed in git forever, and
          // how the protocol name went missing for as long again (049).
          name_official: country.nameOfficial ?? null,
          summary: country.summary ?? null,
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

interface PeopleLanguageRow {
  people_id: string;
  language_id: string;
}

/** Build each unique corpus-declared edge and reject codes the language load cannot satisfy. */
// @req REQ-136
function collectPeopleLanguageRows(
  peoples: People[],
  languageRecords: LanguageRecord[],
  report: MigrationSectionReport
): PeopleLanguageRow[] {
  const loadedLanguageIds = new Set(
    languageRecords.map((language) => language.id)
  );
  const seen = new Set<string>();
  const rows: PeopleLanguageRow[] = [];

  for (const people of peoples) {
    for (const languageId of people.content.languages?.isoCodes ?? []) {
      if (!languageId) {
        continue;
      }

      const relationId = `${people.id}:${languageId}`;
      if (seen.has(relationId)) {
        continue;
      }
      seen.add(relationId);
      report.total += 1;

      if (!loadedLanguageIds.has(languageId)) {
        report.errors.push(
          `${people.id} ↔ ${languageId}: language code is absent from loaded language records`
        );
        continue;
      }

      rows.push({ people_id: people.id, language_id: languageId });
    }
  }

  return rows;
}

/** Persist corpus-declared people/language edges in bounded, replay-safe batches. */
// @req REQ-136
async function upsertPeopleLanguages(
  supabase: AdminClient,
  rows: PeopleLanguageRow[],
  report: MigrationSectionReport
): Promise<void> {
  for (const [index, batch] of chunk(rows).entries()) {
    if (batch.length === 0) {
      continue;
    }

    try {
      const { error } = await supabase
        .from("afrik_people_languages")
        .upsert(batch, { onConflict: "people_id,language_id" });

      if (error) {
        report.errors.push(`Batch ${index + 1}: ${error.message}`);
      } else {
        report.inserted += batch.length;
      }
    } catch (error) {
      report.errors.push(`Batch ${index + 1}: ${errorMessage(error)}`);
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

/**
 * Finds — and, when asked, removes — rows the corpus no longer declares.
 *
 * Paged rather than a plain `select("id")`: PostgREST truncates at 1000 rows
 * without saying so, and a truncated read would both hide orphans and shrink
 * the denominator the safety cap is measured against.
 */
async function pruneCorpusOrphans(
  supabase: AdminClient,
  table: AfrikTable,
  sourceIds: readonly string[],
  options: { prune: boolean }
): Promise<CorpusOrphanReport> {
  const rows = await fetchAllPages<{ id: string }>((from, to) =>
    supabase.from(table).select("id").range(from, to)
  );

  const scan = scanCorpusOrphans({
    table,
    databaseIds: rows.map((row) => row.id),
    sourceIds,
  });

  if (scan.orphans.length === 0) {
    return { ...scan, deleted: 0 };
  }

  if (scan.refusal) {
    logger.error("Corpus orphan prune refused", {
      table,
      refusal: scan.refusal,
      orphans: scan.orphans.slice(0, 20),
    });
    return { ...scan, deleted: 0 };
  }

  if (!options.prune) {
    logger.warn(
      "Row(s) present in the database with no fiche in the corpus — rerun with --prune --apply to remove them",
      { table, orphans: scan.orphans }
    );
    return { ...scan, deleted: 0 };
  }

  const { error } = await supabase.from(table).delete().in("id", scan.orphans);
  if (error) {
    return {
      ...scan,
      refusal: `Failed to prune ${table}: ${error.message}`,
      deleted: 0,
    };
  }

  logger.info("Pruned rows the corpus no longer declares", {
    table,
    deleted: scan.orphans,
  });
  return { ...scan, deleted: scan.orphans.length };
}

async function scanAllCorpusOrphans(
  supabase: AdminClient,
  corpus: {
    languageFamilies: LanguageFamily[];
    peoples: People[];
    countries: Country[];
  },
  options: { prune: boolean }
): Promise<Record<AfrikTable, CorpusOrphanReport>> {
  const ids = <T extends { id: string }>(records: T[]) =>
    records.map((record) => record.id);

  return {
    afrik_language_families: await pruneCorpusOrphans(
      supabase,
      "afrik_language_families",
      ids(corpus.languageFamilies),
      options
    ),
    afrik_peoples: await pruneCorpusOrphans(
      supabase,
      "afrik_peoples",
      ids(corpus.peoples),
      options
    ),
    afrik_countries: await pruneCorpusOrphans(
      supabase,
      "afrik_countries",
      ids(corpus.countries),
      options
    ),
  };
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
    report.languages.errors.length > 0 ||
    report.peoples.errors.length > 0 ||
    report.peopleLanguages.errors.length > 0 ||
    report.countries.errors.length > 0 ||
    report.relations.errors.length > 0 ||
    report.peopleRelations.errors.length > 0 ||
    report.migrations.errors.length > 0 ||
    report.names.errors.length > 0 ||
    report.appellations.errors.length > 0 ||
    // A refusal is a red run on purpose: the database and the corpus disagree
    // by more than the sync dares resolve on its own, and a green board would
    // bury that.
    Object.values(report.corpusOrphans).some((table) => table.refusal) ||
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
  const syncTarget = resolveAfrikSyncTarget(options.target);

  const dryRun = options.dryRun ?? true;
  const prune = options.prune ?? false;
  const writeErrorReport = options.writeErrorReport ?? true;
  const supabase = createAdminClient();
  const report = createMigrationReport();

  const languageFamilies = await loadAllLanguageFamilies();
  report.languageFamilies.total = languageFamilies.length;

  const peoples = await loadAllPeoples();
  report.peoples.total = peoples.length;

  const languageRecords = loadAllLanguages(peoples);
  report.languages.total = languageRecords.length;
  const peopleLanguageRows = collectPeopleLanguageRows(
    peoples,
    languageRecords,
    report.peopleLanguages
  );

  const countries = await loadAllCountries();
  report.countries.total = countries.length;

  const sources = sourceSnapshot(languageFamilies, peoples, countries);
  report.verification.before = compareAfrikDrift(
    sources,
    await databaseSnapshot(supabase)
  );

  const languageFamilyStatuses = await readClassificationStatuses(
    supabase,
    "afrik_language_families"
  );
  const peopleStatuses = await readClassificationStatuses(
    supabase,
    "afrik_peoples"
  );
  report.protectedDrift.languageFamilies = findProtectedClassificationDrift(
    languageFamilies,
    languageFamilyStatuses
  );
  report.protectedDrift.peoples = findProtectedClassificationDrift(
    peoples,
    peopleStatuses
  );

  if (dryRun) {
    report.relations.total = countRelations(peoples);
    report.peopleRelations.total = loadAllRelationFiles().length;
    report.migrations.total = loadAllMigrationFiles().length;
    // Never prunes here whatever the flag says — a preview that deleted rows
    // would not be a preview.
    report.corpusOrphans = await scanAllCorpusOrphans(
      supabase,
      { languageFamilies, peoples, countries },
      { prune: false }
    );
    logger.info("AFRIK synchronization preview completed", {
      target: syncTarget.environment,
      languageFamilies: report.languageFamilies.total,
      languages: report.languages.total,
      peoples: report.peoples.total,
      peopleLanguages: report.peopleLanguages,
      countries: report.countries.total,
      relations: report.relations.total,
      peopleRelations: report.peopleRelations.total,
      migrations: report.migrations.total,
      protectedDrift: report.protectedDrift,
      corpusOrphans: report.corpusOrphans,
      drift: report.verification.before,
    });
    return report;
  }

  await upsertLanguageFamilies(
    supabase,
    languageFamilies,
    languageFamilyStatuses,
    report
  );
  const validFamilyIds = await readIds(supabase, "afrik_language_families");

  // Families must be committed before languages so language.family_id resolves.
  report.languages = await loadLanguages(supabase, languageRecords);

  await upsertPeoples(
    supabase,
    peoples,
    validFamilyIds,
    peopleStatuses,
    report
  );
  await upsertPeopleLanguages(
    supabase,
    peopleLanguageRows,
    report.peopleLanguages
  );

  const migrationRecords = loadAllMigrationFiles();
  const migrationsReport = await loadMigrations(supabase, migrationRecords);
  report.migrations.total = migrationsReport.total;
  report.migrations.inserted = migrationsReport.inserted;
  report.migrations.errors = migrationsReport.errors;

  // Derived first, hand-sourced dossiers second: loadNameRecords upserts on
  // the same (entity, name, type) key, so a noms/ entry overwrites the
  // weaker record derived from the fiche rather than competing with it.
  report.appellations = await loadPeopleAppellations(supabase, peoples);

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

  // After every upsert, so a fiche added on this very run is never mistaken
  // for a row the corpus dropped.
  report.corpusOrphans = await scanAllCorpusOrphans(
    supabase,
    { languageFamilies, peoples, countries },
    { prune }
  );

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
      target: syncTarget.environment,
      languageFamilies: report.languageFamilies,
      languages: report.languages,
      peoples: report.peoples,
      peopleLanguages: report.peopleLanguages,
      countries: report.countries,
      relations: report.relations,
      peopleRelations: report.peopleRelations,
      migrations: report.migrations,
      names: report.names,
      appellations: {
        total: report.appellations.total,
        inserted: report.appellations.inserted,
        rejected: report.appellations.rejected.length,
        errors: report.appellations.errors.length,
      },
      protectedDrift: report.protectedDrift,
      corpusOrphans: report.corpusOrphans,
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
    prune: args.includes("--prune"),
    target: {
      environment: cliTarget(args),
      activeSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      productionSupabaseUrl: process.env.AFRIK_PRODUCTION_SUPABASE_URL,
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

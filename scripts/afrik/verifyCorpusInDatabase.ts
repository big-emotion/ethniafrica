/**
 * Does the database serve what git holds?
 *
 * The sync loads the corpus and checks the `content` of three tables; nothing
 * checked the rest, or checked anything at all when the sync did not run. A
 * preview failing on recette once left the database frozen for days while git
 * advanced, and every board stayed green, because a load that never happens
 * reports nothing. This runs after the apply step and asks the question
 * directly, read-only, for every table of the entity backbone:
 *
 *  - the row count equals what the JSON loaders produce — in both directions,
 *    since the sync only upserts and a row git dropped is still served;
 *  - a deterministic sample (sorted keys, every Nth, ~50 per table) hashes the
 *    same, over exactly the columns the loader writes.
 *
 * The column lists restate the loader's upserts, whose row builders are
 * private to the loader. The test reads those upserts back so a column the
 * loader starts writing cannot go uncompared.
 *
 * Usage: npx tsx --conditions=react-server scripts/afrik/verifyCorpusInDatabase.ts --target=recette|production
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { config } from "dotenv";

import { loadAllCountries } from "@/lib/afrik/loaders/countryLoader";
import type { LanguageRecord } from "@/lib/afrik/loaders/languageCsvLoader";
import { loadAllLanguages } from "@/lib/afrik/loaders/languageCsvLoader";
import { loadAllLanguageFamilies } from "@/lib/afrik/loaders/languageFamilyLoader";
import {
  loadAllPatronymeDossiers,
  type PatronymeBatch,
} from "@/lib/afrik/loaders/patronymeJsonLoader";
import { loadAllPeoples } from "@/lib/afrik/loaders/peopleLoader";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_BATCH_REQUEST_TIMEOUT_MS } from "@/lib/supabase/requestDeadline";
import type { Country, LanguageFamily, People } from "@/types/afrik";

import { resolveAfrikSyncTarget } from "../lib/afrikSyncTarget";
import { chunkForUrl, fetchAllPages } from "../lib/supabasePaging";

export const SAMPLE_SIZE = 50;

/** In load order, so a report reads the way the sync ran. */
export const CORPUS_TABLES = [
  "afrik_language_families",
  "afrik_languages",
  "afrik_peoples",
  "afrik_people_languages",
  "afrik_countries",
  "afrik_people_countries",
  "afrik_patronymes",
] as const;

export type CorpusTable = (typeof CORPUS_TABLES)[number];
type Row = Record<string, unknown>;

export interface CorpusSnapshot {
  languageFamilies: LanguageFamily[];
  languages: LanguageRecord[];
  peoples: People[];
  countries: Country[];
  patronymes: PatronymeBatch["dossiers"];
}

export interface TableExpectation {
  table: CorpusTable;
  /** The table's primary key; its first column is the one sampled on. */
  primaryKey: readonly string[];
  /** Every column the loader writes, minus bookkeeping (`updated_at`). */
  columns: readonly string[];
  rows: Row[];
}

export interface TableObservation {
  count: number;
  /** The database's rows for the sampled keys, and only those. */
  sampleRows: Row[];
}

export interface TableVerdict {
  table: CorpusTable;
  expectedCount: number;
  actualCount: number;
  sampled: number;
  mismatches: string[];
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, member]) => member !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, member]) => [key, canonicalize(member)])
    );
  }
  return value;
}

/**
 * JSON with sorted keys and no undefined members. jsonb hands keys back in its
 * own order and cannot store undefined, so anything less stable would report
 * every row of the corpus as drifted.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function selectSampleKeys(
  keys: readonly string[],
  size: number = SAMPLE_SIZE
): string[] {
  const sorted = [...new Set(keys)].sort();
  const step = Math.max(1, Math.floor(sorted.length / size));
  return sorted.filter((_, index) => index % step === 0).slice(0, size);
}

export function sampleKeysFor(expectation: TableExpectation): string[] {
  const sampleColumn = expectation.primaryKey[0];
  return selectSampleKeys(
    expectation.rows.map((row) => String(row[sampleColumn]))
  );
}

function project(row: Row, columns: readonly string[]): Row {
  return Object.fromEntries(
    columns.map((column) => [column, row[column] ?? null])
  );
}

function pairRows(
  peoples: People[],
  column: "country_id" | "language_id",
  targetsOf: (people: People) => readonly string[] | undefined,
  loadedTargets: Set<string>
): Row[] {
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const people of peoples) {
    for (const target of targetsOf(people) ?? []) {
      const key = `${people.id}:${target}`;
      if (!target || !loadedTargets.has(target) || seen.has(key)) continue;
      seen.add(key);
      rows.push({ people_id: people.id, [column]: target });
    }
  }
  return rows;
}

/** The rows `migrateAfrikToDatabase.ts --apply` writes, table by table. */
export function buildCorpusExpectations(
  corpus: CorpusSnapshot
): TableExpectation[] {
  return [
    {
      table: "afrik_language_families",
      primaryKey: ["id"],
      columns: ["id", "name_fr", "name_en", "content"],
      rows: corpus.languageFamilies.map((family) => ({
        id: family.id,
        name_fr: family.nameFr,
        name_en: family.nameEn ?? null,
        content: family.content,
      })),
    },
    {
      table: "afrik_languages",
      primaryKey: ["id"],
      columns: ["id", "name", "family_id", "content", "spelling_aliases"],
      rows: corpus.languages.map((language) => ({
        id: language.id,
        name: language.name,
        family_id: language.familyId ?? null,
        // Mirrors languageProvenanceLoader's persistedContent(); undefined
        // members vanish in canonicalJson exactly as the loader omits them.
        content: {
          nameProvenance: language.nameProvenance,
          glottocode: language.glottocode,
          nameEn: language.nameEn,
          alternateNames: language.alternateNames,
          peoples: language.peoples,
          vehicularRole: language.vehicularRole,
          dialects: language.dialects,
          vitalityStatus: language.vitalityStatus,
        },
        spelling_aliases: language.spellingAliases ?? [],
      })),
    },
    {
      table: "afrik_peoples",
      primaryKey: ["id"],
      columns: [
        "id",
        "name_main",
        "language_family_id",
        "content",
        "spelling_aliases",
      ],
      rows: corpus.peoples.map((people) => ({
        id: people.id,
        name_main: people.nameMain,
        language_family_id: people.languageFamilyId,
        content: people.content,
        spelling_aliases: people.content?.appellations?.spellingAliases ?? [],
      })),
    },
    {
      table: "afrik_people_languages",
      primaryKey: ["people_id", "language_id"],
      columns: ["people_id", "language_id"],
      rows: pairRows(
        corpus.peoples,
        "language_id",
        (people) => people.content?.languages?.isoCodes,
        new Set(corpus.languages.map((language) => language.id))
      ),
    },
    {
      table: "afrik_countries",
      primaryKey: ["id"],
      columns: [
        "id",
        "name_fr",
        "name_official",
        "name_en",
        "summary",
        "etymology",
        "name_origin_actor",
        "content",
      ],
      rows: corpus.countries.map((country) => ({
        id: country.id,
        name_fr: country.nameFr,
        name_official: country.nameOfficial ?? null,
        name_en: country.nameEn ?? null,
        summary: country.summary ?? null,
        etymology: country.etymology ?? null,
        name_origin_actor: country.nameOriginActor ?? null,
        content: country.content,
      })),
    },
    {
      table: "afrik_people_countries",
      primaryKey: ["people_id", "country_id"],
      columns: ["people_id", "country_id"],
      rows: pairRows(
        corpus.peoples,
        "country_id",
        (people) => people.currentCountries,
        new Set(corpus.countries.map((country) => country.id))
      ),
    },
    {
      table: "afrik_patronymes",
      primaryKey: ["id"],
      columns: ["id", "name_system", "caste_or_social_function", "content"],
      rows: corpus.patronymes.map((dossier) => ({
        id: dossier.id,
        name_system: dossier.nameSystem,
        caste_or_social_function: dossier.casteOrSocialFunction?.value ?? null,
        content: dossier,
      })),
    },
  ];
}

function groupBy(rows: Row[], column: string): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(row[column]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

function groupDigest(rows: Row[]): string {
  return digest(rows.map((row) => canonicalJson(row)).sort());
}

export function compareTable(
  expectation: TableExpectation,
  observation: TableObservation
): TableVerdict {
  const { table, columns } = expectation;
  const sampleColumn = expectation.primaryKey[0];
  const mismatches: string[] = [];

  if (observation.count !== expectation.rows.length) {
    mismatches.push(
      `row count: git holds ${expectation.rows.length}, the database has ${observation.count}`
    );
  }

  const sampleKeys = sampleKeysFor(expectation);
  const expected = groupBy(
    expectation.rows.map((row) => project(row, columns)),
    sampleColumn
  );
  const actual = groupBy(
    observation.sampleRows.map((row) => project(row, columns)),
    sampleColumn
  );

  for (const key of sampleKeys) {
    const want = expected.get(key) ?? [];
    const got = actual.get(key) ?? [];

    if (got.length === 0) {
      mismatches.push(`${key}: absent from the database`);
      continue;
    }
    if (groupDigest(want) === groupDigest(got)) continue;

    if (want.length === 1 && got.length === 1) {
      const differing = columns
        .filter(
          (column) =>
            canonicalJson(want[0][column]) !== canonicalJson(got[0][column])
        )
        .sort();
      mismatches.push(`${key}: differs in ${differing.join(", ")}`);
    } else {
      mismatches.push(
        `${key}: git holds ${want.length} row(s), the database ${got.length}, and they differ`
      );
    }
  }

  return {
    table,
    expectedCount: expectation.rows.length,
    actualCount: observation.count,
    sampled: sampleKeys.length,
    mismatches,
  };
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function readCorpus(): Promise<{
  corpus: CorpusSnapshot;
  rejectedPatronymes: string[];
}> {
  const languageFamilies = await loadAllLanguageFamilies();
  const peoples = await loadAllPeoples();
  const countries = await loadAllCountries();
  const patronymeBatch = loadAllPatronymeDossiers();

  return {
    corpus: {
      languageFamilies,
      languages: loadAllLanguages(peoples),
      peoples,
      countries,
      patronymes: patronymeBatch.dossiers,
    },
    rejectedPatronymes: patronymeBatch.errors,
  };
}

async function observeTable(
  supabase: AdminClient,
  expectation: TableExpectation
): Promise<TableObservation> {
  const { table, primaryKey, columns } = expectation;

  const { count, error } = await supabase
    .from(table)
    .select(primaryKey[0], { count: "exact", head: true });
  if (error) throw new Error(`Failed to count ${table}: ${error.message}`);

  const sampleRows: Row[] = [];
  for (const keys of chunkForUrl(sampleKeysFor(expectation))) {
    // Ordered on the full primary key so pages cannot overlap or skip: a
    // relation table's sample can in principle cross PostgREST's silent cap.
    const rows = await fetchAllPages<Row>((from, to) => {
      let query = supabase
        .from(table)
        .select(columns.join(","))
        .in(primaryKey[0], keys);
      for (const column of primaryKey) query = query.order(column);
      return query.range(from, to) as unknown as PromiseLike<{
        data: Row[] | null;
        error: unknown;
      }>;
    });
    sampleRows.push(...rows);
  }

  return { count: count ?? 0, sampleRows };
}

const MISMATCHES_SHOWN_PER_TABLE = 20;

async function main(): Promise<void> {
  config({ path: resolve(process.cwd(), ".env.local") });

  const target = resolveAfrikSyncTarget({
    environment: process.argv
      .find((argument) => argument.startsWith("--target="))
      ?.slice("--target=".length),
    activeSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    productionSupabaseUrl: process.env.AFRIK_PRODUCTION_SUPABASE_URL,
  });
  const supabase = createAdminClient({
    requestTimeoutMs: SUPABASE_BATCH_REQUEST_TIMEOUT_MS,
  });

  const { corpus, rejectedPatronymes } = await readCorpus();
  console.log(
    `Verifying that ${target.environment} serves the corpus git holds\n`
  );

  let failed = false;
  for (const expectation of buildCorpusExpectations(corpus)) {
    const verdict = compareTable(
      expectation,
      await observeTable(supabase, expectation)
    );
    const mark = verdict.mismatches.length === 0 ? "✓" : "✖";
    console.log(
      `  ${mark} ${verdict.table.padEnd(24)} ${String(verdict.actualCount).padStart(5)} / ${verdict.expectedCount} rows, ${verdict.sampled} sampled`
    );
    for (const mismatch of verdict.mismatches.slice(
      0,
      MISMATCHES_SHOWN_PER_TABLE
    )) {
      console.log(`      ${mismatch}`);
    }
    if (verdict.mismatches.length > MISMATCHES_SHOWN_PER_TABLE) {
      console.log(
        `      … and ${verdict.mismatches.length - MISMATCHES_SHOWN_PER_TABLE} more`
      );
    }
    failed ||= verdict.mismatches.length > 0;
  }

  // A dossier the loader rejects is written nowhere, so it is absent from the
  // expectation too; naming it keeps "matches git" from hiding it.
  if (rejectedPatronymes.length > 0) {
    console.log(
      `\n  note: ${rejectedPatronymes.length} patronyme dossier(s) fail to parse and are compared as absent from git`
    );
  }

  if (failed) {
    console.error(
      `\n${target.environment} does not serve what git holds. Read the loader's error report, then re-run the sync; a row git no longer declares is removed only with --prune (docs/runbooks/afrik-data-sync.md).`
    );
    process.exit(1);
  }

  console.log(`\n${target.environment} serves the corpus git holds.`);
}

if (process.argv[1]?.endsWith("verifyCorpusInDatabase.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

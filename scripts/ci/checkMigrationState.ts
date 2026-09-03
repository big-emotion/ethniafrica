/**
 * CI gate — every migration file must be applied to the target database, and
 * still say what it said when it was applied.
 *
 * This exists because "Jira Done" and "pull request merged" have both been
 * mistaken for "migration applied" on this project. 037 and 038 were marked
 * Done with their PR merged while neither was live on any database, and the
 * corpora that depended on them loaded zero rows until somebody checked by
 * hand. Nothing in CI could have caught it: the ledger lives in
 * supabase_migrations, which PostgREST does not expose. Migration 042 adds the
 * read-only function this reads.
 *
 * Four states are reported, and three of them fail the build:
 *   pending      — on disk, never applied. The database is behind the code.
 *   orphaned     — applied, but the file is gone. Nobody can reproduce the schema.
 *   drifted      — applied, but the file changed since. The two disagree, and
 *                  the file is the one people read.
 *   unverifiable — applied before the ledger captured statements. Reported, not
 *                  failed: failing here would flag the whole early history.
 *
 * Usage:
 *   npx tsx scripts/ci/checkMigrationState.ts                      # recette
 *   npx tsx scripts/ci/checkMigrationState.ts --target=production  # production
 *   npx tsx scripts/ci/checkMigrationState.ts --json               # machine-readable
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for recette, and
 * PRODUCTION_SUPABASE_URL / PRODUCTION_SUPABASE_SERVICE_ROLE_KEY under
 * `--target=production`. Without them it exits 1 saying so, rather than
 * reporting a clean database it never reached — and it never falls back from
 * one environment's credentials to the other's.
 */
import path from "node:path";

import {
  auditMigrationFiles,
  readMigrationFiles,
  reconcileMigrations,
  type LedgerRow,
  type Reconciliation,
} from "../lib/migrationLedger";
import { ADJUDICATED_DRIFT, unadjudicatedDrift } from "./adjudicatedDrift";
import { resolveMigrationStateTarget } from "../lib/migrationStateTarget";

const MIGRATIONS_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations"
);

export class LedgerUnavailableError extends Error {}

/**
 * Calls `public.applied_migrations()`, the SECURITY DEFINER function migration
 * 042 grants to service_role.
 */
export async function fetchLedger(
  supabaseUrl: string,
  serviceRoleKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<LedgerRow[]> {
  const response = await fetchImpl(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/applied_migrations`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  );

  if (!response.ok) {
    const body = await response.text();
    // PGRST202 is "function not found in schema cache" — the usual cause is
    // that 042 itself has not been applied yet, which is worth saying out loud
    // rather than reporting as a generic HTTP failure.
    const hint = body.includes("PGRST202")
      ? " — migration 042_migration_ledger_introspection.sql is not applied to this database yet; apply it first"
      : "";
    throw new LedgerUnavailableError(
      `applied_migrations() returned HTTP ${response.status}${hint}: ${body.slice(0, 300)}`
    );
  }

  const rows = (await response.json()) as Array<{
    version: string;
    name: string;
    statements: string[] | null;
  }>;

  return rows.map((row) => ({
    version: row.version,
    name: row.name,
    statements: row.statements ?? [],
  }));
}

/**
 * Whether the comparison is settled: nothing pending or orphaned, and every
 * drifted migration explained. Drift alone is not a failure — unexplained drift
 * is.
 */
export function isSettled(result: Reconciliation): boolean {
  if (result.pending.length > 0 || result.orphaned.length > 0) return false;
  return (
    unadjudicatedDrift(result.drifted.map((entry) => entry.filename)).length ===
    0
  );
}

export function formatReport(result: Reconciliation, target: string): string {
  const lines: string[] = [];
  const say = (line: string) => lines.push(line);

  say(`Migration state — ${target}`);
  say(
    `  applied ${result.applied.length} · pending ${result.pending.length} · orphaned ${result.orphaned.length} · drifted ${result.drifted.length}`
  );

  if (result.pending.length > 0) {
    say("");
    say("PENDING — on disk, never applied. The database is behind the code:");
    for (const entry of result.pending) say(`  ${entry.filename}`);
  }

  if (result.orphaned.length > 0) {
    say("");
    say("ORPHANED — applied, but no file describes them any more:");
    for (const entry of result.orphaned) {
      say(`  ${entry.version} ${entry.name}`);
    }
  }

  if (result.drifted.length > 0) {
    const unsettled = new Set(
      unadjudicatedDrift(result.drifted.map((entry) => entry.filename))
    );

    const open = result.drifted.filter((entry) =>
      unsettled.has(entry.filename)
    );
    const settled = result.drifted.filter(
      (entry) => !unsettled.has(entry.filename)
    );

    if (open.length > 0) {
      say("");
      say("DRIFTED — the file changed after it was applied; the two disagree:");
      for (const entry of open) {
        say(`  ${entry.filename} (applied as version ${entry.ledgerVersion})`);
      }
    }

    // Listed, not hidden: an adjudicated entry is a settled question, and the
    // reader should be able to see which ones were settled and why.
    if (settled.length > 0) {
      say("");
      say(
        "ADJUDICATED — examined and closed; see scripts/ci/adjudicatedDrift.ts:"
      );
      for (const entry of settled) {
        const record = ADJUDICATED_DRIFT.find(
          (candidate) => candidate.filename === entry.filename
        );
        say(`  ${entry.filename} (${record?.adjudicatedOn ?? "undated"})`);
      }
    }
  }

  if (result.unverifiable.length > 0) {
    say("");
    say(
      `NOTE — ${result.unverifiable.length} migration(s) were applied before the ledger stored statements, so drift cannot be judged for them.`
    );
  }

  say("");
  say(
    isSettled(result)
      ? "check:migration-state — OK (every migration applied; any drift adjudicated)"
      : "check:migration-state — the database and supabase/migrations/ disagree"
  );

  return lines.join("\n");
}

async function runCli(): Promise<void> {
  const asJson = process.argv.includes("--json");
  const files = readMigrationFiles(MIGRATIONS_DIR);

  // Checked in every mode: a duplicate version or a hole in the sequence is
  // wrong regardless of what any database has applied.
  const fileErrors = auditMigrationFiles(files);
  for (const error of fileErrors) {
    console.error(`check:migration-state — ${error}`);
  }

  // On a pull request the migration being added is pending by definition, so
  // comparing against a database says nothing. --files-only checks what is
  // knowable before a merge; the ledger comparison belongs after one.
  if (process.argv.includes("--files-only")) {
    if (fileErrors.length > 0) {
      process.exitCode = 1;
      return;
    }
    console.log(
      `check:migration-state — OK (${files.length} migration files, no duplicate version or name, no hole in the sequence)`
    );
    return;
  }

  const targetFlag = process.argv
    .find((argument) => argument.startsWith("--target="))
    ?.slice("--target=".length);

  let supabaseUrl: string;
  let serviceRoleKey: string;
  let environment: string;
  try {
    ({ supabaseUrl, serviceRoleKey, environment } = resolveMigrationStateTarget(
      {
        environment: targetFlag,
        recetteUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        recetteKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        productionUrl: process.env.PRODUCTION_SUPABASE_URL,
        productionKey: process.env.PRODUCTION_SUPABASE_SERVICE_ROLE_KEY,
      }
    ));
  } catch (error) {
    console.error(`check:migration-state — ${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }

  let ledger: LedgerRow[];
  try {
    ledger = await fetchLedger(supabaseUrl, serviceRoleKey);
  } catch (error) {
    console.error(
      `check:migration-state — could not read the ledger: ${(error as Error).message}`
    );
    process.exitCode = 1;
    return;
  }

  const result = reconcileMigrations(files, ledger);
  const target = `${environment} (${new URL(supabaseUrl).host})`;

  if (asJson) {
    console.log(JSON.stringify({ target, ...result }, null, 2));
  } else {
    console.log(formatReport(result, target));
  }

  // `isClean` counts any drift as a failure. The gate fails on *unexplained*
  // drift instead, so a settled difference cannot keep it red forever.
  if (!isSettled(result) || fileErrors.length > 0) process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  void runCli();
}

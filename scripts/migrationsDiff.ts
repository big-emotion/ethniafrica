/**
 * Shows what a database is missing, and what it disagrees with.
 *
 * `check:migration-state` answers yes or no for CI. This answers "what exactly,
 * and what SQL would run" for a human about to roll out — the question the
 * Supabase dashboard cannot answer, because it lists what was applied and not
 * what the repository holds.
 *
 * Usage:
 *   npm run migrations:diff              # pending migrations, names only
 *   npm run migrations:diff -- --sql     # …with the SQL that would run
 */
import path from "node:path";

import {
  readMigrationFiles,
  reconcileMigrations,
  type Reconciliation,
} from "./lib/migrationLedger";
import { fetchLedger } from "./ci/checkMigrationState";

const MIGRATIONS_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "supabase",
  "migrations"
);

const RULE = "─".repeat(72);

export function renderDiff(
  result: Reconciliation,
  target: string,
  withSql: boolean
): string {
  const lines: string[] = [];
  const say = (line = "") => lines.push(line);

  say(RULE);
  say(`Migration diff — ${target}`);
  say(
    `${result.applied.length} applied · ${result.pending.length} pending · ${result.orphaned.length} orphaned · ${result.drifted.length} drifted`
  );
  say(RULE);

  if (result.isClean) {
    say();
    say("Nothing to do. Every migration file is applied and unchanged.");
    return lines.join("\n");
  }

  if (result.pending.length > 0) {
    say();
    say(`PENDING (${result.pending.length}) — these would run, in this order:`);
    for (const entry of result.pending) {
      say();
      say(`  ▸ ${entry.filename}`);
      if (withSql) {
        for (const sqlLine of entry.sql.trimEnd().split("\n")) {
          say(`      ${sqlLine}`);
        }
      }
    }
    if (!withSql) {
      say();
      say("  Re-run with --sql to see the statements.");
    }
  }

  if (result.orphaned.length > 0) {
    say();
    say(
      `ORPHANED (${result.orphaned.length}) — applied to the database, but no file describes them.`
    );
    say(
      "  The schema can no longer be rebuilt from the repository. Recover the file from git history or write one that reproduces the change."
    );
    for (const entry of result.orphaned) {
      say(`  ▸ ${entry.version} ${entry.name}`);
    }
  }

  if (result.drifted.length > 0) {
    say();
    say(
      `DRIFTED (${result.drifted.length}) — the file changed after it was applied.`
    );
    say(
      "  Re-running it will not close the gap: the ledger already counts it as done. Write a new migration for the difference."
    );
    for (const entry of result.drifted) {
      say();
      say(`  ▸ ${entry.filename} (applied as version ${entry.ledgerVersion})`);

      // The 160-character excerpt is unusable here, and this is the one section
      // where that matters: the two sides are identical for far longer than the
      // excerpt, so it prints the same prefix twice and tells the reader nothing.
      // Pointing at the first differing offset is what actually answers the
      // question the section asks — what do I put in the corrective migration.
      if (withSql) {
        const divergence = firstDivergence(entry.ledgerSql, entry.fileSql);
        say(`      diverges at character ${divergence}`);
        say(`      in the database: ${entry.ledgerSql}`);
        say(`      in the file:     ${entry.fileSql}`);
      } else {
        say(`      in the database: ${excerpt(entry.ledgerSql)}`);
        say(`      in the file:     ${excerpt(entry.fileSql)}`);
        say(
          `      (both sides truncated to ${EXCERPT_LIMIT} chars — pass --sql)`
        );
      }
    }
  }

  if (result.unverifiable.length > 0) {
    say();
    say(
      `Note: ${result.unverifiable.length} migration(s) were applied before the ledger stored statements, so drift cannot be judged for them.`
    );
  }

  return lines.join("\n");
}

const EXCERPT_LIMIT = 160;

function excerpt(sql: string, limit = EXCERPT_LIMIT): string {
  return sql.length <= limit ? sql : `${sql.slice(0, limit)}…`;
}

/**
 * Offset of the first differing character, or -1 when the two are equal.
 *
 * Drift is usually a single token buried thousands of characters into a
 * statement — a renamed column, a changed default. Printing both sides in full
 * leaves the reader to find it by eye; this says where to look.
 */
export function firstDivergence(a: string, b: string): number {
  const shared = Math.min(a.length, b.length);
  for (let index = 0; index < shared; index += 1) {
    if (a[index] !== b[index]) return index;
  }
  return a.length === b.length ? -1 : shared;
}

async function runCli(): Promise<void> {
  const withSql = process.argv.includes("--sql");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "migrations:diff — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the database you want to compare against."
    );
    process.exitCode = 1;
    return;
  }

  const files = readMigrationFiles(MIGRATIONS_DIR);
  try {
    const ledger = await fetchLedger(supabaseUrl, serviceRoleKey);
    console.log(
      renderDiff(
        reconcileMigrations(files, ledger),
        new URL(supabaseUrl).host,
        withSql
      )
    );
  } catch (error) {
    console.error(`migrations:diff — ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  void runCli();
}

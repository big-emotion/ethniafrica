#!/usr/bin/env tsx
/**
 * check:rls-coverage — no table may reach production without Row Level Security.
 *
 * Supabase grants the `anon` role broad privileges on the `public` schema, and
 * the anon key ships inside the browser bundle. A table with RLS disabled is
 * therefore writable by anyone who opens the site and reads the JS. Migration
 * 019 exists because the five AFRIK tables spent six months in exactly that
 * state; migration 031 then created `assertion_references` the same way, with
 * no RLS, no policy and no grants. Both were found by hand, months late.
 *
 * This gate closes that loop: it replays the migration set as a schema
 * timeline (CREATE adds a table, DROP removes it along with the RLS it
 * carried) and fails on any table still live at the end of the timeline that
 * never received `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
 *
 * It reads the migration files, not the database — the recette and production
 * projects drift whenever a migration reaches only one, and the files are the
 * only truth both are supposed to converge on. `check:migration-state` is the
 * gate that measures how far each has drifted from them.
 * Enabling RLS with no policy at all denies everything to anon, which is safe;
 * the gate deliberately does not audit policy *contents*, only their absence
 * at the RLS switch.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export interface MigrationFile {
  /** Filename, used verbatim in the failure message so the fix is locatable. */
  path: string;
  sql: string;
}

export interface RlsCoverageAudit {
  /** Tables still present once every migration has been replayed, sorted. */
  liveTables: string[];
  /** Live tables that no migration ever put behind RLS, sorted. */
  tablesWithoutRls: string[];
  messages: string[];
  exitCode: 0 | 1;
}

const IDENTIFIER = String.raw`(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)`;
/** Captures the table name, discarding any `schema.` qualifier before it. */
const QUALIFIED_TABLE = String.raw`(?:${IDENTIFIER}\s*\.\s*)?(${IDENTIFIER})`;

const CREATE_TABLE = String.raw`\bCREATE\s+(?:UNLOGGED\s+|TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${QUALIFIED_TABLE}`;
const DROP_TABLE = String.raw`\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([^;]*)`;
const ENABLE_RLS = String.raw`\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?${QUALIFIED_TABLE}\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY`;

const DROP_TRAILING_KEYWORDS = new Set(["cascade", "restrict"]);

/**
 * Blank out the parts of a statement that look like DDL but are not: `--` and
 * `/* *\/` comments and single-quoted literals. Migration 039's header quotes
 * "CREATE TABLE IF NOT EXISTS sources" in prose, and 039's own COMMENT ON
 * string contains "DROP TABLE in 007" — both would otherwise be parsed as
 * schema changes. Dollar-quoted bodies are left intact: `DO $$ ... $$` blocks
 * carry real ALTER TABLE statements.
 */
export function stripSqlNoise(sql: string): string {
  let stripped = "";
  let cursor = 0;

  while (cursor < sql.length) {
    const pair = sql.slice(cursor, cursor + 2);

    if (pair === "--") {
      while (cursor < sql.length && sql[cursor] !== "\n") cursor += 1;
      continue;
    }

    if (pair === "/*") {
      cursor += 2;
      while (cursor < sql.length && sql.slice(cursor, cursor + 2) !== "*/") {
        cursor += 1;
      }
      cursor += 2;
      stripped += " ";
      continue;
    }

    if (sql[cursor] === "'") {
      cursor += 1;
      while (cursor < sql.length) {
        if (sql[cursor] === "'" && sql[cursor + 1] === "'") {
          cursor += 2;
          continue;
        }
        if (sql[cursor] === "'") {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      stripped += "''";
      continue;
    }

    stripped += sql[cursor];
    cursor += 1;
  }

  return stripped;
}

/** Resolve an identifier the way Postgres does: quoted keeps case, bare folds. */
function resolveIdentifier(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('"') ? trimmed.slice(1, -1) : trimmed.toLowerCase();
}

type SchemaChange =
  | { at: number; change: "create" | "rls"; table: string }
  | { at: number; change: "drop"; table: string };

function schemaChangesIn(strippedSql: string): SchemaChange[] {
  const changes: SchemaChange[] = [];

  for (const match of strippedSql.matchAll(new RegExp(CREATE_TABLE, "gi"))) {
    changes.push({
      at: match.index,
      change: "create",
      table: resolveIdentifier(match[1]),
    });
  }

  for (const match of strippedSql.matchAll(new RegExp(ENABLE_RLS, "gi"))) {
    changes.push({
      at: match.index,
      change: "rls",
      table: resolveIdentifier(match[1]),
    });
  }

  for (const match of strippedSql.matchAll(new RegExp(DROP_TABLE, "gi"))) {
    // A single DROP TABLE can list several tables before CASCADE/RESTRICT.
    for (const name of match[1].matchAll(new RegExp(IDENTIFIER, "gi"))) {
      const table = resolveIdentifier(name[0]);
      if (DROP_TRAILING_KEYWORDS.has(table)) continue;
      changes.push({ at: match.index, change: "drop", table });
    }
  }

  return changes.sort((left, right) => left.at - right.at);
}

export function auditRlsCoverage(
  migrations: MigrationFile[]
): RlsCoverageAudit {
  /** Live table → the migration that created it, for the failure message. */
  const createdBy = new Map<string, string>();
  const behindRls = new Set<string>();

  for (const migration of migrations) {
    for (const change of schemaChangesIn(stripSqlNoise(migration.sql))) {
      if (change.change === "create") {
        if (!createdBy.has(change.table)) {
          createdBy.set(change.table, migration.path);
        }
      } else if (change.change === "rls") {
        behindRls.add(change.table);
      } else {
        // Dropping a table drops its RLS with it; a later CREATE starts over.
        createdBy.delete(change.table);
        behindRls.delete(change.table);
      }
    }
  }

  const liveTables = [...createdBy.keys()].sort();
  const tablesWithoutRls = liveTables.filter((table) => !behindRls.has(table));

  const messages = tablesWithoutRls.map(
    (table) =>
      `check:rls-coverage — ${table} — created in ${createdBy.get(table)}, never put behind ENABLE ROW LEVEL SECURITY`
  );

  return {
    liveTables,
    tablesWithoutRls,
    messages,
    exitCode: tablesWithoutRls.length > 0 ? 1 : 0,
  };
}

export function readMigrations(directory: string): MigrationFile[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({
      path: name,
      sql: readFileSync(path.join(directory, name), "utf8"),
    }));
}

function runCli(): void {
  const migrationsDirectory = path.resolve(
    import.meta.dirname,
    "../../supabase/migrations"
  );
  const audit = auditRlsCoverage(readMigrations(migrationsDirectory));

  for (const message of audit.messages) console.error(message);

  if (audit.exitCode === 1) {
    console.error(
      `check:rls-coverage — ${audit.tablesWithoutRls.length} of ${audit.liveTables.length} tables are reachable with the browser-side anon key`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `check:rls-coverage — OK (${audit.liveTables.length} tables, all behind RLS)`
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  runCli();
}

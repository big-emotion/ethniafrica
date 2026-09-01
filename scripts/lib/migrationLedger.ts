/**
 * Reconciles `supabase/migrations/*.sql` against what a database has actually
 * applied.
 *
 * Two facts about this repository's history shape the whole design:
 *
 * 1. **The ledger's version string is not the file's number.** Migrations
 *    applied through the Supabase MCP tooling are recorded under a timestamp
 *    (`20260825211643`) rather than the number their file carries (`037`). A
 *    comparison keyed on version reports three applied migrations as pending —
 *    which is exactly how 037/038/039 were believed unapplied while they were
 *    live. Matching is therefore on **name**, which both sides agree on.
 *
 * 2. **An applied migration can stop describing the database.** Migration 003
 *    added a UNIQUE constraint; migration 007 dropped the table and 009
 *    recreated it without the constraint. 003 stayed recorded as applied, so
 *    nothing flagged the loss, and three corpora silently loaded zero rows for
 *    months. We cannot detect that case from the ledger alone — but we can
 *    detect its cheaper cousin, a migration file edited after it was applied,
 *    by comparing the file to the statements the ledger recorded at the time.
 */

import fs from "node:fs";
import path from "node:path";

export interface MigrationFile {
  /** The filename's numeric or timestamp prefix. */
  version: string;
  /** The filename's remainder, which is what the ledger stores as `name`. */
  name: string;
  filename: string;
  sql: string;
}

export interface LedgerRow {
  version: string;
  name: string;
  /** The statements the database executed, one per array entry. */
  statements: string[];
}

export interface AppliedMigration extends MigrationFile {
  ledgerVersion: string;
}

export interface DriftedMigration extends AppliedMigration {
  fileSql: string;
  ledgerSql: string;
}

export interface Reconciliation {
  /** On disk, never applied. */
  pending: MigrationFile[];
  /** Applied, but the file is gone. */
  orphaned: LedgerRow[];
  /** Applied, but the file has changed since. */
  drifted: DriftedMigration[];
  /** Applied, but the ledger kept no statements, so drift cannot be judged. */
  unverifiable: AppliedMigration[];
  /** Applied and unchanged. */
  applied: AppliedMigration[];
  isClean: boolean;
}

const FILENAME = /^(\d+)_(.+)\.sql$/;

/** Splits `041_one_source_tier_vocabulary.sql` into its version and its name. */
export function parseMigrationFilename(
  filename: string
): { version: string; name: string } | null {
  const match = FILENAME.exec(filename);
  if (!match) return null;
  return { version: match[1], name: match[2] };
}

/**
 * Reduces SQL to a form where two spellings of the same migration compare
 * equal: comments dropped, whitespace collapsed, case folded, statement
 * terminators discounted. String literals are preserved, so a `--` inside one
 * is not mistaken for a comment.
 *
 * Terminators have to go because the two sides do not agree on them. The
 * Supabase CLI splits a file into statements and drops each `;`, so a file
 * ending `END $$;` is stored as `END $$`. Measured against the real recette
 * ledger, treating that separator as content marked 41 of 42 migrations
 * drifted — and a gate that cries wolf on everything is worse than no gate,
 * because it teaches people to ignore it. Removing them symmetrically costs
 * only the ability to notice a moved statement boundary; a genuine edit still
 * changes tokens.
 */
export function normaliseSql(sql: string): string {
  let out = "";
  let index = 0;

  while (index < sql.length) {
    const char = sql[index];

    // Dollar-quoted bodies come first, because inside one the ordinary quoting
    // rules do not apply. 018 seeds editorial doctrine as French prose inside
    // `$mdx$ ... $mdx$`, and reading its apostrophes as string delimiters
    // desynchronised the scanner: with an odd number of them everything after
    // the block was misparsed, a trailing `;` survived on one side only, and
    // three migrations reported as drifted while the database and the files
    // agreed.
    const dollarTag = readDollarTag(sql, index);
    if (dollarTag !== null) {
      const end = findDollarEnd(sql, index + dollarTag.length, dollarTag);
      out += sql.slice(index, end);
      index = end;
      continue;
    }

    if (char === "'") {
      // SQL concatenates adjacent string literals separated by whitespace, so a
      // comment written across several quoted lines in a file is a single
      // string once the database has it. 039 writes its constraint comment that
      // way and reported as drifted against a ledger holding the joined result.
      // Adjacency on the same line is not valid SQL, so folding on any
      // whitespace cannot merge two strings the parser would keep apart.
      let end = findStringEnd(sql, index);
      let body = sql.slice(index, end);
      let next = skipWhitespace(sql, end);
      while (sql[next] === "'") {
        const nextEnd = findStringEnd(sql, next);
        body = body.slice(0, -1) + sql.slice(next + 1, nextEnd);
        end = nextEnd;
        next = skipWhitespace(sql, end);
      }
      out += body;
      index = end;
      continue;
    }

    if (char === "-" && sql[index + 1] === "-") {
      const newline = sql.indexOf("\n", index);
      index = newline === -1 ? sql.length : newline;
      out += " ";
      continue;
    }

    if (char === "/" && sql[index + 1] === "*") {
      const close = sql.indexOf("*/", index + 2);
      index = close === -1 ? sql.length : close + 2;
      out += " ";
      continue;
    }

    // Outside a string literal a semicolon separates statements rather than
    // saying anything, and the ledger does not keep it.
    out += char === ";" ? " " : char;
    index += 1;
  }

  return out.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * The dollar-quote tag opening at `start` (`$$`, `$mdx$`, `$fn$`), or null.
 *
 * Postgres allows an optional identifier between the dollars, and the closing
 * delimiter must repeat it exactly — which is the whole point of the syntax:
 * a body can then contain any quote character without escaping.
 */
function readDollarTag(sql: string, start: number): string | null {
  if (sql[start] !== "$") return null;
  const match = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(start));
  return match ? match[0] : null;
}

/** Index just past the closing dollar tag, or the end of input if unterminated. */
function findDollarEnd(sql: string, from: number, tag: string): number {
  const close = sql.indexOf(tag, from);
  return close === -1 ? sql.length : close + tag.length;
}

/** Index of the first non-whitespace character at or after `from`. */
function skipWhitespace(sql: string, from: number): number {
  let index = from;
  while (index < sql.length && /\s/.test(sql[index])) index += 1;
  return index;
}

/** Index just past the closing quote, treating `''` as an escaped quote. */
function findStringEnd(sql: string, start: number): number {
  let index = start + 1;
  while (index < sql.length) {
    if (sql[index] === "'") {
      if (sql[index + 1] === "'") {
        index += 2;
        continue;
      }
      return index + 1;
    }
    index += 1;
  }
  return sql.length;
}

/** Reads every migration file in `directory`, in the order Postgres applies them. */
export function readMigrationFiles(directory: string): MigrationFile[] {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .sort()
    .flatMap((filename) => {
      const parsed = parseMigrationFilename(filename);
      if (!parsed) return [];
      return [
        {
          ...parsed,
          filename,
          sql: fs.readFileSync(path.join(directory, filename), "utf8"),
        },
      ];
    });
}

/**
 * Invariants the migration set must hold on its own, checkable on a pull
 * request with no database in reach — unlike "is it applied", which is only
 * meaningful after a merge.
 *
 * Both failures come from the same place: two branches editing the sequence in
 * parallel. Git merges them without complaint, and Postgres then applies them
 * in filename order, so which of two `040_` files wins is decided by the rest
 * of the name rather than by anyone.
 *
 * Timestamp-versioned files (what the Supabase CLI generates) sit outside the
 * numbered sequence and are excluded from the gap check.
 */
export function auditMigrationFiles(files: MigrationFile[]): string[] {
  const errors: string[] = [];

  const byVersion = new Map<string, MigrationFile[]>();
  const byName = new Map<string, MigrationFile[]>();
  for (const file of files) {
    byVersion.set(file.version, [...(byVersion.get(file.version) ?? []), file]);
    byName.set(file.name, [...(byName.get(file.name) ?? []), file]);
  }

  for (const [version, clashing] of byVersion) {
    if (clashing.length > 1) {
      errors.push(
        `version ${version} is claimed by ${clashing.length} files (${clashing
          .map((file) => file.filename)
          .join(", ")}) — Postgres would order them by name, not by intent`
      );
    }
  }

  // The ledger keys on name, so two migrations sharing one make the applied
  // state unreadable: reconciliation cannot tell which file a row refers to.
  for (const [name, clashing] of byName) {
    if (clashing.length > 1) {
      errors.push(
        `name "${name}" is used by ${clashing.length} files (${clashing
          .map((file) => file.filename)
          .join(", ")}) — the ledger keys on name and could not tell them apart`
      );
    }
  }

  const numbered = files
    .map((file) => file.version)
    .filter((version) => version.length <= 4)
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  for (let index = 1; index < numbered.length; index += 1) {
    const previous = numbered[index - 1];
    const current = numbered[index];
    for (let missing = previous + 1; missing < current; missing += 1) {
      errors.push(
        `no migration numbered ${String(missing).padStart(3, "0")} — the sequence between ${String(previous).padStart(3, "0")} and ${String(current).padStart(3, "0")} has a hole, so the schema cannot be rebuilt from this directory`
      );
    }
  }

  return errors;
}

export function reconcileMigrations(
  files: MigrationFile[],
  ledger: LedgerRow[]
): Reconciliation {
  const byName = new Map(ledger.map((entry) => [entry.name, entry]));
  const matchedNames = new Set<string>();

  const pending: MigrationFile[] = [];
  const drifted: DriftedMigration[] = [];
  const unverifiable: AppliedMigration[] = [];
  const applied: AppliedMigration[] = [];

  for (const file of files) {
    const entry = byName.get(file.name);
    if (!entry) {
      pending.push(file);
      continue;
    }

    matchedNames.add(file.name);
    const record: AppliedMigration = { ...file, ledgerVersion: entry.version };

    // A row stored without its statements predates statement capture; treating
    // that absence as drift would flag the entire early history.
    if (entry.statements.length === 0) {
      unverifiable.push(record);
      applied.push(record);
      continue;
    }

    const fileSql = normaliseSql(file.sql);
    const ledgerSql = normaliseSql(entry.statements.join("\n"));

    if (fileSql !== ledgerSql) {
      drifted.push({ ...record, fileSql, ledgerSql });
      continue;
    }

    applied.push(record);
  }

  const orphaned = ledger.filter((entry) => !matchedNames.has(entry.name));

  return {
    pending,
    orphaned,
    drifted,
    unverifiable,
    applied,
    isClean:
      pending.length === 0 && orphaned.length === 0 && drifted.length === 0,
  };
}

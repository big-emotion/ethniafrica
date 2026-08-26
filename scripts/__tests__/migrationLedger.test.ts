import { describe, it, expect } from "vitest";

import {
  parseMigrationFilename,
  normaliseSql,
  reconcileMigrations,
  auditMigrationFiles,
  type LedgerRow,
  type MigrationFile,
} from "../lib/migrationLedger";

const file = (
  version: string,
  name: string,
  sql = "CREATE TABLE t (id int);"
): MigrationFile => ({
  version,
  name,
  filename: `${version}_${name}.sql`,
  sql,
});

const row = (
  version: string,
  name: string,
  statements: string[]
): LedgerRow => ({
  version,
  name,
  statements,
});

describe("parseMigrationFilename", () => {
  // @req REQ-032
  it("splits the numeric prefix from the name the ledger records", () => {
    expect(
      parseMigrationFilename("041_one_source_tier_vocabulary.sql")
    ).toEqual({
      version: "041",
      name: "one_source_tier_vocabulary",
    });
  });

  // @req REQ-032
  it("reads a timestamp-prefixed filename, which the Supabase CLI generates", () => {
    expect(
      parseMigrationFilename("20260825211643_colonization_event_types.sql")
    ).toEqual({ version: "20260825211643", name: "colonization_event_types" });
  });

  // @req REQ-032
  it("rejects a filename with no version prefix rather than guessing one", () => {
    expect(parseMigrationFilename("rollback.sql")).toBeNull();
  });
});

describe("reconcileMigrations", () => {
  // A migration applied through the MCP tooling is recorded under a timestamp,
  // not under the number its file carries. Matching on version reports applied
  // migrations as pending — the failure mode that hid 037/038/039.
  // @req REQ-032
  it("matches a file to its ledger row by name, not by version", () => {
    const result = reconcileMigrations(
      [file("037", "colonization_event_types")],
      [
        row("20260825211643", "colonization_event_types", [
          "CREATE TABLE t (id int);",
        ]),
      ]
    );

    expect(result.pending).toEqual([]);
    expect(result.applied.map((entry) => entry.name)).toEqual([
      "colonization_event_types",
    ]);
  });

  // @req REQ-032
  it("reports a file the ledger has never seen as pending, in file order", () => {
    const result = reconcileMigrations(
      [
        file("040", "assertion_references_rls"),
        file("041", "one_source_tier_vocabulary"),
      ],
      []
    );

    expect(result.pending.map((entry) => entry.version)).toEqual([
      "040",
      "041",
    ]);
  });

  // @req REQ-032
  it("reports a ledger row whose file has disappeared as orphaned", () => {
    const result = reconcileMigrations(
      [],
      [row("012", "api_keys", ["CREATE TABLE api_keys (id int);"])]
    );

    expect(result.orphaned.map((entry) => entry.name)).toEqual(["api_keys"]);
  });

  // The dangerous one: migration 003 was recorded applied, its constraint was
  // later dropped by another migration, and nothing flagged the divergence for
  // months. Comparing the recorded statements to the file catches an edited
  // migration before it silently means something different on each database.
  // @req REQ-032
  it("reports a file edited after it was applied as drifted", () => {
    const result = reconcileMigrations(
      [file("003", "add_unique_constraint", "ALTER TABLE sources ADD x int;")],
      [row("003", "add_unique_constraint", ["ALTER TABLE sources ADD y int;"])]
    );

    expect(result.drifted.map((entry) => entry.name)).toEqual([
      "add_unique_constraint",
    ]);
    expect(result.pending).toEqual([]);
  });

  // @req REQ-032
  it("does not call a file drifted over whitespace or comments alone", () => {
    const result = reconcileMigrations(
      [
        file(
          "003",
          "add_unique_constraint",
          "-- restores the constraint\nALTER TABLE sources\n  ADD x int;\n"
        ),
      ],
      [row("003", "add_unique_constraint", ["ALTER TABLE sources ADD x int;"])]
    );

    expect(result.drifted).toEqual([]);
    expect(result.applied).toHaveLength(1);
  });

  // The ledger splits a migration into one row entry per statement; the file is
  // one blob. Comparing them requires joining, not zipping.
  // @req REQ-032
  it("compares a multi-statement migration against the joined ledger statements", () => {
    const result = reconcileMigrations(
      [
        file(
          "019",
          "afrik_rls",
          "ALTER TABLE a ENABLE ROW LEVEL SECURITY;\nCREATE POLICY p ON a FOR SELECT USING (true);"
        ),
      ],
      [
        row("019", "afrik_rls", [
          "ALTER TABLE a ENABLE ROW LEVEL SECURITY;",
          "CREATE POLICY p ON a FOR SELECT USING (true);",
        ]),
      ]
    );

    expect(result.drifted).toEqual([]);
  });

  // Measured against the real recette ledger: the Supabase CLI splits a file
  // into statements and drops each terminator, so `END $$;` is stored as
  // `END $$`. Counting that separator as content marked 41 of 42 migrations
  // drifted on first contact — a gate that cries wolf on everything is worse
  // than none, because it teaches people to ignore it.
  // @req REQ-032
  it("does not call a file drifted over the statement terminators the ledger strips", () => {
    const result = reconcileMigrations(
      [
        file(
          "003",
          "add_unique_constraint",
          "DO $$\nBEGIN\n  ALTER TABLE sources ADD x int;\nEND $$;\n"
        ),
      ],
      [
        row("003", "add_unique_constraint", [
          "DO $$\nBEGIN\n  ALTER TABLE sources ADD x int;\nEND $$",
        ]),
      ]
    );

    expect(result.drifted).toEqual([]);
    expect(result.applied).toHaveLength(1);
  });

  // @req REQ-032
  it("still sees a real edit once terminators are discounted", () => {
    const result = reconcileMigrations(
      [
        file(
          "003",
          "add_unique_constraint",
          "ALTER TABLE sources ADD x int;\n"
        ),
      ],
      [row("003", "add_unique_constraint", ["ALTER TABLE sources ADD y int"])]
    );

    expect(result.drifted.map((entry) => entry.name)).toEqual([
      "add_unique_constraint",
    ]);
  });

  // @req REQ-032
  it("cannot judge drift on a row the ledger stored without its statements", () => {
    const result = reconcileMigrations(
      [file("001", "initial_schema", "CREATE TABLE t (id int);")],
      [row("001", "initial_schema", [])]
    );

    expect(result.drifted).toEqual([]);
    expect(result.unverifiable.map((entry) => entry.name)).toEqual([
      "initial_schema",
    ]);
  });

  // @req REQ-032
  it("is clean when every file is applied and unchanged", () => {
    const result = reconcileMigrations(
      [file("001", "initial_schema"), file("002", "add_enriched_fields")],
      [
        row("001", "initial_schema", ["CREATE TABLE t (id int);"]),
        row("002", "add_enriched_fields", ["CREATE TABLE t (id int);"]),
      ]
    );

    expect(result.pending).toEqual([]);
    expect(result.orphaned).toEqual([]);
    expect(result.drifted).toEqual([]);
    expect(result.isClean).toBe(true);
  });

  // @req REQ-032
  it("is not clean while anything is pending", () => {
    const result = reconcileMigrations(
      [file("040", "assertion_references_rls")],
      []
    );
    expect(result.isClean).toBe(false);
  });
});

describe("auditMigrationFiles", () => {
  // Two branches each adding "040_" merge cleanly in git and then race for the
  // same slot. Postgres applies them in filename order, so which one wins
  // depends on the rest of the name — a coin flip nobody chose.
  // @req REQ-032
  it("rejects two files claiming the same version", () => {
    const errors = auditMigrationFiles([
      file("040", "assertion_references_rls"),
      file("040", "something_else"),
    ]);

    expect(errors.join(" ")).toMatch(/040/);
    expect(errors).toHaveLength(1);
  });

  // A gap means a migration was written and then deleted, or never committed.
  // Either way the sequence no longer reproduces the schema.
  // @req REQ-032
  it("rejects a gap in the numeric sequence", () => {
    const errors = auditMigrationFiles([
      file("001", "a"),
      file("002", "b"),
      file("004", "d"),
    ]);

    expect(errors.join(" ")).toMatch(/003/);
  });

  // @req REQ-032
  it("accepts a contiguous sequence", () => {
    expect(
      auditMigrationFiles([
        file("001", "a"),
        file("002", "b"),
        file("003", "c"),
      ])
    ).toEqual([]);
  });

  // Timestamp-versioned files are what the Supabase CLI generates; they sit
  // outside the numbered sequence and must not be read as a gap.
  // @req REQ-032
  it("does not count a timestamp-versioned file as part of the numbered sequence", () => {
    expect(
      auditMigrationFiles([
        file("001", "a"),
        file("002", "b"),
        file("20260825211643", "cli_generated"),
      ])
    ).toEqual([]);
  });

  // @req REQ-032
  it("rejects two files sharing a name, which the ledger keys on", () => {
    const errors = auditMigrationFiles([
      file("001", "same_name"),
      file("002", "same_name"),
    ]);

    expect(errors.join(" ")).toMatch(/same_name/);
  });
});

describe("normaliseSql", () => {
  // Terminators go too: the ledger stores statements without them, so keeping
  // them would make every file differ from its own recorded form.
  // @req REQ-032
  it("drops comments, repeated whitespace and statement terminators", () => {
    expect(normaliseSql("-- header\n/* block */\nSELECT   1,\n       2;")).toBe(
      "select 1, 2"
    );
  });

  // @req REQ-032
  it("keeps a double dash that sits inside a string literal", () => {
    expect(normaliseSql("SELECT 'a -- b';")).toBe("select 'a -- b'");
  });

  // A semicolon inside a literal is content, not a separator.
  // @req REQ-032
  it("keeps a semicolon that sits inside a string literal", () => {
    expect(normaliseSql("SELECT 'a; b';")).toBe("select 'a; b'");
  });
});

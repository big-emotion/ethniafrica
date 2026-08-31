import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";

import {
  auditRlsCoverage,
  readMigrations,
  stripSqlNoise,
  type MigrationFile,
} from "../checkRlsCoverage";

const migrationsDirectory = path.resolve(
  __dirname,
  "../../../supabase/migrations"
);

describe("stripSqlNoise", () => {
  // @req REQ-054
  it("removes line comments, so a table named only in prose is never collected", () => {
    const stripped = stripSqlNoise(
      "-- CREATE TABLE IF NOT EXISTS sources was lost here\nCREATE TABLE kept ();"
    );
    expect(stripped).not.toContain("was lost here");
    expect(stripped).toContain("CREATE TABLE kept");
  });

  // @req REQ-054
  it("removes block comments", () => {
    expect(
      stripSqlNoise("/* DROP TABLE gone; */CREATE TABLE kept ();")
    ).toContain("CREATE TABLE kept ();");
  });

  // @req REQ-054
  it("empties string literals, so DDL quoted inside a COMMENT is not parsed", () => {
    const stripped = stripSqlNoise(
      "COMMENT ON TABLE kept IS 'lost to the V1 DROP TABLE in 007';"
    );
    expect(stripped).not.toContain("DROP TABLE in 007");
  });

  // @req REQ-054
  it("treats a doubled quote as part of the literal instead of its end", () => {
    const stripped = stripSqlNoise(
      "COMMENT ON TABLE kept IS 'l''histoire'; ALTER TABLE kept ENABLE ROW LEVEL SECURITY;"
    );
    expect(stripped).toContain("ALTER TABLE kept ENABLE ROW LEVEL SECURITY");
  });
});

describe("auditRlsCoverage", () => {
  const protectedSet: MigrationFile[] = [
    {
      path: "001_initial.sql",
      sql: `
        CREATE TABLE african_regions (id UUID PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS public.assertions (id UUID PRIMARY KEY);
      `,
    },
    {
      path: "002_rls.sql",
      sql: `
        ALTER TABLE african_regions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.assertions  ENABLE ROW LEVEL SECURITY;
      `,
    },
  ];

  // @req REQ-054
  it("passes when every table the migrations create is later put behind RLS", () => {
    const audit = auditRlsCoverage(protectedSet);
    expect(audit.tablesWithoutRls).toEqual([]);
    expect(audit.exitCode).toBe(0);
  });

  // @req REQ-054
  it("fails and names the table when one is created but never put behind RLS", () => {
    const audit = auditRlsCoverage([
      ...protectedSet,
      {
        path: "003_normalized_sources.sql",
        sql: `CREATE TABLE IF NOT EXISTS assertion_references (id UUID PRIMARY KEY);`,
      },
    ]);
    expect(audit.tablesWithoutRls).toEqual(["assertion_references"]);
    expect(audit.exitCode).toBe(1);
    expect(audit.messages.join("\n")).toContain(
      "assertion_references — created in 003_normalized_sources.sql"
    );
  });

  // @req REQ-054
  it("accepts an ALTER TABLE that qualifies the schema the CREATE TABLE left implicit", () => {
    const audit = auditRlsCoverage([
      { path: "001.sql", sql: `CREATE TABLE quiz_questions (id UUID);` },
      {
        path: "002.sql",
        sql: `ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;`,
      },
    ]);
    expect(audit.exitCode).toBe(0);
  });

  // @req REQ-054
  it("folds an unquoted identifier to lower case and preserves a quoted one, as Postgres does", () => {
    const audit = auditRlsCoverage([
      { path: "001.sql", sql: `CREATE TABLE "MixedCase" (id UUID);` },
      { path: "002.sql", sql: `CREATE TABLE MixedCase (id UUID);` },
      {
        path: "003.sql",
        sql: `ALTER TABLE mixedcase ENABLE ROW LEVEL SECURITY;`,
      },
    ]);
    expect(audit.liveTables).toEqual(["MixedCase", "mixedcase"]);
    expect(audit.tablesWithoutRls).toEqual(["MixedCase"]);
  });

  // @req REQ-054
  it("stops requiring RLS on a table a later migration dropped", () => {
    const audit = auditRlsCoverage([
      { path: "001.sql", sql: `CREATE TABLE ethnic_groups (id UUID);` },
      { path: "002.sql", sql: `DROP TABLE IF EXISTS ethnic_groups CASCADE;` },
    ]);
    expect(audit.liveTables).toEqual([]);
    expect(audit.tablesWithoutRls).toEqual([]);
  });

  // @req REQ-054
  it("drops every table listed in a single comma-separated DROP TABLE", () => {
    const audit = auditRlsCoverage([
      {
        path: "001.sql",
        sql: `CREATE TABLE contributions (id UUID); CREATE TABLE languages (id UUID);`,
      },
      {
        path: "002.sql",
        sql: `DROP TABLE IF EXISTS contributions, languages CASCADE;`,
      },
    ]);
    expect(audit.liveTables).toEqual([]);
  });

  // @req REQ-054
  it("re-arms the requirement when a dropped table is created again later", () => {
    const audit = auditRlsCoverage([
      { path: "001.sql", sql: `CREATE TABLE sources (id UUID);` },
      { path: "002.sql", sql: `DROP TABLE IF EXISTS sources CASCADE;` },
      { path: "003.sql", sql: `CREATE TABLE IF NOT EXISTS sources (id UUID);` },
    ]);
    expect(audit.tablesWithoutRls).toEqual(["sources"]);
  });
});

describe("the supabase/migrations tree this repository ships", () => {
  // @req REQ-054
  it("leaves no table reachable with the browser-side anon key without RLS", () => {
    const audit = auditRlsCoverage(readMigrations(migrationsDirectory));
    expect(audit.tablesWithoutRls).toEqual([]);
    expect(audit.exitCode).toBe(0);
  });

  // @req REQ-054
  it("reads every migration file, in the numeric order Supabase applies them", () => {
    const names = readMigrations(migrationsDirectory).map(
      (migration) => migration.path
    );
    expect(names[0]).toBe("001_initial_schema.sql");
    expect(names).toEqual([...names].sort());
    expect(names).toHaveLength(
      readdirSync(migrationsDirectory).filter((name) => name.endsWith(".sql"))
        .length
    );
  });
});

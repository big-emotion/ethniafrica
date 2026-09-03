import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

import { countPlannedMigrations } from "../lib/countPlannedMigrations";

const fixture = readFileSync(
  resolve(__dirname, "__fixtures__/dbPushDryRun.txt"),
  "utf-8"
);

describe("countPlannedMigrations", () => {
  // The exact output of `supabase db push --include-all --dry-run` against
  // production on 2026-09-03, kept verbatim. The gate that used to parse this
  // inline looked for a line starting with three digits, and the CLI prefixes
  // each entry with a bullet — so it counted 0 every time, on every release,
  // and could never have refused a plan for being too wide either.
  // @req REQ-032
  it("counts the migrations the CLI actually lists", () => {
    expect(countPlannedMigrations(fixture)).toBe(20);
  });

  // The other real shape: nothing to do. Distinguishing this from a parse
  // failure is the whole point — the caller refuses a zero it did not expect.
  // @req REQ-032
  it("counts none when the remote is already up to date", () => {
    const upToDate = [
      "DRY RUN: migrations will *not* be pushed to the database.",
      "Connecting to local database...",
      "Remote database is up to date.",
    ].join("\n");

    expect(countPlannedMigrations(upToDate)).toBe(0);
  });

  // Prose that merely mentions a file is not an entry. Without this the count
  // drifts upward on any CLI that starts explaining itself, and an inflated
  // count trips the "wider than the measurement" refusal on a correct plan.
  // @req REQ-032
  it("ignores a filename mentioned outside a list entry", () => {
    const chatty = [
      "Would push these migrations:",
      " • 062_restore_038_rls_comments.sql",
      "Note: 007_remove_v1_add_v2_contribution_types.sql was skipped.",
    ].join("\n");

    expect(countPlannedMigrations(chatty)).toBe(1);
  });

  // A hyphen or asterisk instead of a bullet, and no marker at all: the three
  // shapes this output has taken across CLI versions.
  // @req REQ-032
  it("accepts the list markers the CLI has used", () => {
    const markers = [
      " • 062_a.sql",
      " - 063_b.sql",
      " * 064_c.sql",
      "065_d.sql",
    ].join("\n");

    expect(countPlannedMigrations(markers)).toBe(4);
  });
});

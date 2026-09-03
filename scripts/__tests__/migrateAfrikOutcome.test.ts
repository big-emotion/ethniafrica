import { describe, expect, it } from "vitest";

import {
  EDITORIAL_DEFECT_CEILING,
  classifySyncOutcome,
  emptyMigrationReport,
  type MigrationReport,
} from "../migrateAfrikToDatabase";

/**
 * The sync loaded 800/800 peoples, 24/24 families, 54/54 countries and
 * 777/777 patronymes, then exited 1 over 51 malformed appellations and one
 * relation — 0.6% of ~9 200 records. Seventeen runs in a row reported that
 * the same way a total failure would, and a red that never changes stops
 * being read. These tests hold the two apart.
 */

function reportWith(overrides: Partial<MigrationReport> = {}): MigrationReport {
  return { ...emptyMigrationReport(), ...overrides };
}

describe("classifySyncOutcome", () => {
  // @req REQ-032
  it("passes a load that delivered the corpus with no defects", () => {
    const outcome = classifySyncOutcome(reportWith());

    expect(outcome.structuralFailures).toEqual([]);
    expect(outcome.editorialDefects).toBe(0);
    expect(outcome.failed).toBe(false);
  });

  // The 2026-09-03 shape: everything structural landed, the appellation tail
  // did not. That is a curation backlog, not a broken pipeline.
  // @req REQ-032
  it("does not fail a load whose only defects are editorial and within the ceiling", () => {
    const report = reportWith();
    report.appellations.errors = Array.from({ length: 51 }, (_, i) => `a${i}`);
    report.relations.errors = ["PPL_X→PPL_Y: unknown target"];

    const outcome = classifySyncOutcome(report);

    expect(outcome.structuralFailures).toEqual([]);
    expect(outcome.editorialDefects).toBe(52);
    expect(outcome.failed).toBe(false);
  });

  // A descending ratchet, like checkSourceTierCoverage: the tail may shrink
  // freely, but it may never grow back unnoticed.
  // @req REQ-032
  it("fails when the editorial tail grows past the recorded ceiling", () => {
    const report = reportWith();
    report.appellations.errors = Array.from(
      { length: EDITORIAL_DEFECT_CEILING + 1 },
      (_, i) => `a${i}`
    );

    const outcome = classifySyncOutcome(report);

    expect(outcome.structuralFailures).toEqual([]);
    expect(outcome.editorialDefects).toBe(EDITORIAL_DEFECT_CEILING + 1);
    expect(outcome.failed).toBe(true);
  });

  // @req REQ-032
  it("fails on a structural stage however few records it lost", () => {
    const report = reportWith();
    report.peoples.errors = ["PPL_BETE: language family FLG_KROU missing"];

    const outcome = classifySyncOutcome(report);

    expect(outcome.structuralFailures).toEqual(["peoples"]);
    expect(outcome.failed).toBe(true);
  });

  // @req REQ-032
  it("names every structural stage that failed, not just the first", () => {
    const report = reportWith();
    report.languageFamilies.errors = ["FLG_BANTU: timeout"];
    report.countries.errors = ["SEN: timeout"];
    report.verification.errors = ["drift check could not run"];

    expect(classifySyncOutcome(report).structuralFailures).toEqual([
      "languageFamilies",
      "countries",
      "verification",
    ]);
  });

  // Already deliberate before this change, and it stays deliberate: the corpus
  // and the database disagree by more than the sync dares resolve alone.
  // @req REQ-032
  it("still fails on an orphan refusal even with no stage errors", () => {
    const report = reportWith();
    report.corpusOrphans.afrik_peoples = {
      orphans: ["PPL_GONE"],
      refusal: "3 orphans exceed the deletion threshold",
      deleted: 0,
    };

    const outcome = classifySyncOutcome(report);

    expect(outcome.structuralFailures).toEqual(["corpusOrphans"]);
    expect(outcome.failed).toBe(true);
  });

  // A structural failure is not excused by a clean editorial tail, and the
  // editorial count stays reported so one run says both things at once.
  // @req REQ-032
  it("reports both kinds together when both are present", () => {
    const report = reportWith();
    report.peoples.errors = ["PPL_BETE: timeout"];
    report.appellations.errors = ["PPL_FULA: segment declined"];

    const outcome = classifySyncOutcome(report);

    expect(outcome.structuralFailures).toEqual(["peoples"]);
    expect(outcome.editorialDefects).toBe(1);
    expect(outcome.failed).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildCountryTrackerTemplate,
  normalizeCountryId,
  resolveInitPlan,
} from "../lib/countryEnrichmentTemplate";

const snapshot = { countryId: "COD", structural: { filledSections: 8 } };

function template(countryId: string, countryName: string | null) {
  return buildCountryTrackerTemplate({
    countryId,
    countryName,
    updatedAt: "2026-09-06",
    snapshot,
  });
}

describe("normalizeCountryId", () => {
  // @req REQ-032
  it("accepts a lowercase ISO 3166-1 alpha-3 code and upper-cases it", () => {
    expect(normalizeCountryId(" cod ")).toBe("COD");
  });

  // @req REQ-032
  it("rejects anything that is not three letters", () => {
    for (const invalid of ["", "CO", "CODE", "C0D", "C-D"]) {
      expect(normalizeCountryId(invalid)).toBeNull();
    }
  });
});

describe("resolveInitPlan", () => {
  // @req REQ-032
  it("creates the tracker when none exists", () => {
    expect(
      resolveInitPlan({
        countryFicheExists: true,
        trackerExists: false,
        force: false,
      }).action
    ).toBe("create");
  });

  // @req REQ-032
  it("refuses to overwrite an existing tracker without an explicit option", () => {
    const plan = resolveInitPlan({
      countryFicheExists: true,
      trackerExists: true,
      force: false,
    });

    expect(plan.action).toBe("refuse");
    expect(plan.reason).toContain("--force");
  });

  // @req REQ-032
  it("overwrites only when the explicit option is given", () => {
    expect(
      resolveInitPlan({
        countryFicheExists: true,
        trackerExists: true,
        force: true,
      }).action
    ).toBe("overwrite");
  });

  // @req REQ-032
  it("refuses when the country has no source fiche, even with the explicit option", () => {
    const plan = resolveInitPlan({
      countryFicheExists: false,
      trackerExists: false,
      force: true,
    });

    expect(plan.action).toBe("refuse");
    expect(plan.reason).toContain("fiche");
  });
});

describe("buildCountryTrackerTemplate", () => {
  // @req REQ-032
  it("opens one workstream per editorial area, all unstarted", () => {
    const tracker = template("COD", "République démocratique du Congo");

    expect(tracker.workstreams).toHaveLength(10);
    expect(tracker.workstreams.map((workstream) => workstream.id)).toEqual([
      "COD-IDENTITY",
      "COD-PEOPLES",
      "COD-LANGUAGES",
      "COD-HISTORY",
      "COD-HISTORICAL-NAMES",
      "COD-POLITIES",
      "COD-PATRONYMS",
      "COD-SOURCES",
      "COD-DATABASE-SYNC",
      "COD-DISCOVERABILITY",
    ]);
    for (const workstream of tracker.workstreams) {
      expect(workstream.status).toBe("not_started");
      expect(workstream.findings).toEqual([]);
      expect(workstream.remaining.length).toBeGreaterThan(0);
    }
  });

  // @req REQ-032
  it("records database synchronization as unverified until someone checks it", () => {
    const tracker = template("COD", "République démocratique du Congo");

    expect(tracker.databaseSync.status).toBe("not_verified");
    expect(tracker.databaseSync.reason.length).toBeGreaterThan(0);
  });

  // @req REQ-032
  it("forbids a global completeness score", () => {
    expect(template("COD", null).scorePolicy).toBe(
      "vector_only_no_global_score"
    );
  });

  // @req REQ-032
  it("leaves every reference denominator empty rather than guessing one", () => {
    const { references } = template("COD", null);

    for (const reference of Object.values(references)) {
      expect(reference.count).toBeNull();
      expect(reference.source).toBeNull();
    }
  });

  // @req REQ-032
  it("carries the generated snapshot through untouched", () => {
    expect(template("COD", null).snapshot).toEqual(snapshot);
  });

  // @req REQ-032
  it("points at the people ledger and its refresh command", () => {
    const { artifacts } = template("COD", null);

    expect(artifacts.peopleReconciliationLedger.path).toBe(
      "docs/editorial/country-enrichment/COD-peoples.json"
    );
    expect(artifacts.peopleReconciliationLedger.refreshCommand).toContain(
      "updateCountryPeopleLedger.ts COD"
    );
    expect(
      artifacts.peopleReconciliationLedger.reviewFieldsPreservedOnRefresh
    ).toBe(true);
  });

  // @req REQ-032
  it("opens the questions every country must answer, none of them presupposed", () => {
    const tracker = template("COD", null);

    expect(tracker.openQuestions.length).toBeGreaterThan(0);
    for (const question of tracker.openQuestions) {
      expect(question).toMatch(/\?$/);
    }
  });

  // @req REQ-032
  it("injects no country-specific fact beyond the identifier and the fiche name", () => {
    const congo = JSON.stringify(
      { ...template("COD", "Congo"), snapshot: null },
      null,
      2
    );
    const nigeria = JSON.stringify(
      { ...template("NGA", "Congo"), snapshot: null },
      null,
      2
    );

    expect(nigeria.replaceAll("NGA", "COD")).toBe(congo);
  });

  // @req REQ-032
  it("produces identical output for identical input", () => {
    expect(template("COD", "Congo")).toEqual(template("COD", "Congo"));
  });
});

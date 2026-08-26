// @req REQ-028
// @req REQ-032
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import {
  checkPopulationSums,
  checkPopulationSumsStrict,
  summarizeValidationRun,
  SOFT_CHECK_NAMES,
  type ValidationResult,
} from "../validateAfrikData";

function writePays(root: string, isoCode: string, percentages: number[]): void {
  const dir = join(root, "pays");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${isoCode}.json`),
    JSON.stringify({
      id: isoCode,
      content: {
        demographics: {
          peoples: percentages.map((percentageInCountry, index) => ({
            peopleId: `PPL_TEST_${index}`,
            percentageInCountry,
          })),
        },
      },
    })
  );
}

function passing(): ValidationResult {
  return { ok: true, errors: [], warnings: [] };
}

describe("FR28 demographics gate", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_summary_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // @req REQ-028
  it("fails a country whose percentageInCountry sum leaves the hard band [95, 105]", () => {
    writePays(tmpDir, "ZAF", [60, 60]);

    const result = checkPopulationSums(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("ZAF"))).toBe(true);
  });

  // A 104% split clears the hard band but misses the doctrinal target, which is
  // exactly the drift FR28-strict exists to catch.
  // @req REQ-028
  it("fails a country inside [95, 105] but outside the target band [99, 101]", () => {
    writePays(tmpDir, "NGA", [54, 50]);

    expect(checkPopulationSums(tmpDir).ok).toBe(true);

    const strict = checkPopulationSumsStrict(tmpDir);
    expect(strict.ok).toBe(false);
    expect(strict.errors.some((e) => e.includes("NGA"))).toBe(true);
  });

  // @req REQ-028
  it("accepts a country whose split lands inside the target band", () => {
    writePays(tmpDir, "SEN", [40, 60]);

    expect(checkPopulationSums(tmpDir).ok).toBe(true);
    expect(checkPopulationSumsStrict(tmpDir).ok).toBe(true);
  });

  // @req REQ-028
  it("gates the build on FR28: neither variant is registered as advisory", () => {
    expect(SOFT_CHECK_NAMES.has("FR28 Population sums")).toBe(false);
    expect(
      SOFT_CHECK_NAMES.has("FR28-strict Population sums (target 99–101%)")
    ).toBe(false);
  });
});

describe("validation run summary", () => {
  // @req REQ-032
  it("counts every executed check, not just the legacy ones", () => {
    const summary = summarizeValidationRun(
      [
        { category: "IDs", status: "success", message: "ok" },
        { category: "Langues", status: "success", message: "ok" },
      ],
      [
        { name: "FR26 FLG folder match", result: passing() },
        { name: "FR29 ISO validity", result: passing() },
        { name: "Orphan fiches", result: passing() },
      ]
    );

    expect(summary.checksRun).toBe(5);
    expect(summary.checksPassed).toBe(5);
    expect(summary.checks).toHaveLength(5);
    expect(summary.failed).toBe(false);
  });

  // The bug this replaces: 34 integrity checks emitting thousands of warnings
  // still printed "Avertissements: 0" because only legacy results were counted.
  // @req REQ-032
  it("counts warnings emitted by integrity checks", () => {
    const summary = summarizeValidationRun(
      [{ category: "IDs", status: "warning", message: "one legacy warning" }],
      [
        {
          name: "Source catalogue tiers",
          result: {
            ok: true,
            errors: [],
            warnings: ["source A unverified", "source B unverified"],
          },
        },
      ]
    );

    expect(summary.warningCount).toBe(3);
    expect(summary.errorCount).toBe(0);
  });

  // @req REQ-032
  it("reports an enforced check's findings as errors and fails the run", () => {
    const summary = summarizeValidationRun(
      [],
      [
        {
          name: "FR28 Population sums",
          result: { ok: false, errors: ["ZAF sums to 120%"], warnings: [] },
        },
      ]
    );

    expect(summary.errorCount).toBe(1);
    expect(summary.warningCount).toBe(0);
    expect(summary.failed).toBe(true);
    expect(summary.checksPassed).toBe(0);
  });

  // @req REQ-032
  it("reports a soft-gated check's findings as warnings without failing the run", () => {
    const softName = [...SOFT_CHECK_NAMES][0];
    const summary = summarizeValidationRun(
      [],
      [
        {
          name: softName,
          result: {
            ok: false,
            errors: ["PPL_ZULU has no language"],
            warnings: [],
          },
        },
      ]
    );

    expect(summary.warningCount).toBe(1);
    expect(summary.errorCount).toBe(0);
    expect(summary.failed).toBe(false);
  });

  // @req REQ-032
  it("keeps a legacy error failing the run", () => {
    const summary = summarizeValidationRun(
      [{ category: "IDs", status: "error", message: "PPL_X has no FLG" }],
      []
    );

    expect(summary.errorCount).toBe(1);
    expect(summary.failed).toBe(true);
  });

  // The persisted report is what an operator reads after the fact, so it has to
  // carry the same check set the console printed.
  // @req REQ-032
  it("carries every executed check into the persisted report entries", () => {
    const summary = summarizeValidationRun(
      [
        {
          category: "IDs",
          status: "success",
          message: "ok",
          details: ["42 ids"],
        },
      ],
      [{ name: "FR29 ISO validity", result: passing() }]
    );

    expect(summary.checks.map((c) => c.name)).toEqual([
      "IDs",
      "FR29 ISO validity",
    ]);
    expect(summary.checks[0].kind).toBe("legacy");
    expect(summary.checks[0].details).toEqual(["42 ids"]);
    expect(summary.checks[1].kind).toBe("integrity");
  });
});

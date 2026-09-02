import { describe, expect, it } from "vitest";

import {
  ADVISORY_CATEGORIES,
  DEAD_CODE_CATEGORIES,
  DEAD_CODE_CEILINGS,
  evaluateDeadCode,
  tallyKnipReport,
} from "../ci/checkDeadCode";

describe("tallyKnipReport", () => {
  // @req REQ-085
  it("counts unused files from the report's own file list", () => {
    const counts = tallyKnipReport({
      files: ["src/lib/gone.ts", "src/lib/also-gone.ts"],
      issues: [],
    });

    expect(counts.files).toBe(2);
  });

  // @req REQ-085
  it("sums a category across every file that reports it", () => {
    const counts = tallyKnipReport({
      files: [],
      issues: [
        {
          file: "src/a.ts",
          exports: [{ name: "one" }, { name: "two" }],
          types: [{ name: "T" }],
        },
        { file: "src/b.ts", exports: [{ name: "three" }] },
      ],
    });

    expect(counts.exports).toBe(3);
    expect(counts.types).toBe(1);
  });

  // @req REQ-085
  it("reports zero for a category no file raises", () => {
    const counts = tallyKnipReport({ files: [], issues: [] });

    for (const category of DEAD_CODE_CATEGORIES) {
      expect(counts[category], category).toBe(0);
    }
  });
});

describe("evaluateDeadCode", () => {
  const ceilings = { exports: 25, files: 0 } as const;

  // @req REQ-085
  it("passes when every count sits exactly on its ceiling", () => {
    const verdict = evaluateDeadCode({ exports: 25, files: 0 }, { ceilings });

    expect(verdict.ok).toBe(true);
    expect(verdict.errors).toEqual([]);
  });

  // @req REQ-085
  it("fails and names the category when a count rises above its ceiling", () => {
    const verdict = evaluateDeadCode({ exports: 26, files: 0 }, { ceilings });

    expect(verdict.ok).toBe(false);
    expect(verdict.errors.join("\n")).toContain("exports");
    expect(verdict.errors.join("\n")).toContain("26");
  });

  // The ceiling is a ratchet, not a budget to spend: a count that has dropped
  // must be recorded, or the next commit is free to climb back to the old
  // number without the gate noticing.
  // @req REQ-085
  it("fails when a count drops, asking for the ceiling to be lowered", () => {
    const verdict = evaluateDeadCode({ exports: 20, files: 0 }, { ceilings });

    expect(verdict.ok).toBe(false);
    expect(verdict.errors.join("\n")).toMatch(/lower .*exports.* to 20/i);
  });

  // @req REQ-085
  it("reports an advisory category as a notice instead of an error", () => {
    const verdict = evaluateDeadCode(
      { exports: 40, files: 0 },
      { ceilings, advisory: new Set(["exports"]) }
    );

    expect(verdict.ok).toBe(true);
    expect(verdict.errors).toEqual([]);
    expect(verdict.notices.join("\n")).toContain("exports");
  });

  // @req REQ-085
  it("fails on a category knip reports but no ceiling covers", () => {
    const verdict = evaluateDeadCode(
      { exports: 25, files: 0, unlisted: 3 },
      { ceilings }
    );

    expect(verdict.ok).toBe(false);
    expect(verdict.errors.join("\n")).toContain("unlisted");
  });
});

describe("the shipped ceilings", () => {
  // A category knip can raise but the ceilings do not name would be measured
  // and then dropped on the floor — the failure mode this gate exists to end.
  // @req REQ-085
  it("names every category knip can raise", () => {
    for (const category of DEAD_CODE_CATEGORIES) {
      expect(DEAD_CODE_CEILINGS, category).toHaveProperty(category);
    }
  });

  // @req REQ-085
  it("holds the corpus of dead files, dependencies and duplicates at zero", () => {
    expect(DEAD_CODE_CEILINGS.files).toBe(0);
    expect(DEAD_CODE_CEILINGS.dependencies).toBe(0);
    expect(DEAD_CODE_CEILINGS.devDependencies).toBe(0);
    expect(DEAD_CODE_CEILINGS.unlisted).toBe(0);
    expect(DEAD_CODE_CEILINGS.binaries).toBe(0);
    expect(DEAD_CODE_CEILINGS.duplicates).toBe(0);
  });

  // @req REQ-085
  it("keeps every advisory category among the ones it can soften", () => {
    for (const category of ADVISORY_CATEGORIES) {
      expect(DEAD_CODE_CATEGORIES, category).toContain(category);
    }
  });
});

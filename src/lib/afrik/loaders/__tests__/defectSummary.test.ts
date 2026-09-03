import { describe, expect, it } from "vitest";

import { summarizeByCause } from "../defectSummary";

/**
 * All 51 appellation refusals of the 2026-09-03 load were one cause wearing 51
 * different assertion ids. Read one at a time they look like 51 problems; read
 * by cause they are one instruction — give those fiches' sources a tier.
 */
describe("summarizeByCause", () => {
  // @req REQ-057
  it("collapses one cause carrying different record ids into a single line", () => {
    const summary = summarizeByCause([
      "PPL_GOVA: name_records row rejected: assertion af48f562-0fef-4f4f-91e1-264781207c62 cites no qualifying explicitly tiered source.",
      "PPL_KIMBU: name_records row rejected: assertion e0097863-3add-4f40-bd99-d6c2165f4673 cites no qualifying explicitly tiered source.",
    ]);

    expect(summary).toHaveLength(1);
    expect(summary[0].count).toBe(2);
    expect(summary[0].fiches).toEqual(["PPL_GOVA", "PPL_KIMBU"]);
    expect(summary[0].cause).toContain("cites no qualifying explicitly tiered");
    expect(summary[0].cause).not.toContain("af48f562");
  });

  // @req REQ-057
  it("keeps genuinely different causes apart, most frequent first", () => {
    const summary = summarizeByCause([
      "PPL_A: fiche declares no source",
      "PPL_B: sources — timeout",
      "PPL_C: fiche declares no source",
      "PPL_D: fiche declares no source",
    ]);

    expect(summary.map(({ cause, count }) => ({ cause, count }))).toEqual([
      { cause: "fiche declares no source", count: 3 },
      { cause: "sources — timeout", count: 1 },
    ]);
  });

  // @req REQ-057
  it("keeps an entry that carries no fiche prefix rather than dropping it", () => {
    const summary = summarizeByCause(["connection reset"]);

    expect(summary).toEqual([
      { cause: "connection reset", count: 1, fiches: [] },
    ]);
  });

  // @req REQ-057
  it("returns nothing for a clean load", () => {
    expect(summarizeByCause([])).toEqual([]);
  });
});

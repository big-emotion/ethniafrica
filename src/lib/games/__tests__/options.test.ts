import { describe, expect, it } from "vitest";
import {
  assembleOptions,
  correctOptionIndex,
  isSameOptionValue,
  selectDistractors,
} from "../options";

describe("isSameOptionValue", () => {
  // @req REQ-120
  it("compares structured names on their autonym, ignoring the exonym", () => {
    expect(
      isSameOptionValue(
        { autonym: "Yorùbá", exonym: "Yoruba" },
        { autonym: "Yorùbá", exonym: "Yorouba" }
      )
    ).toBe(true);
  });

  // @req REQ-120
  it("treats a plain string and a name sharing that autonym as the same value", () => {
    expect(isSameOptionValue("Bantou", { autonym: "Bantou" })).toBe(true);
  });

  // @req REQ-120
  it("separates two different autonyms", () => {
    expect(isSameOptionValue("Bantou", "Khoïsan")).toBe(false);
  });
});

describe("selectDistractors", () => {
  // @req REQ-120
  it("returns three verbatim pool entries, excluding the correct answer", () => {
    const distractors = selectDistractors("Niger-Congo", [
      "Bantou",
      "Niger-Congo",
      "Khoïsan",
      "Nilo-saharien",
    ]);
    expect(distractors).toEqual(["Bantou", "Khoïsan", "Nilo-saharien"]);
  });

  // @req REQ-120
  it("de-duplicates a pool that repeats the same value", () => {
    const distractors = selectDistractors("Peul", [
      "Bantou",
      "Bantou",
      "Khoïsan",
      "Nilo-saharien",
    ]);
    expect(distractors).toEqual(["Bantou", "Khoïsan", "Nilo-saharien"]);
  });

  // FR65/FR66: a short pool yields no round rather than a padded one.
  // @req REQ-120
  it("returns null rather than padding when fewer than three distractors remain", () => {
    expect(selectDistractors("Peul", ["Bantou", "Khoïsan"])).toBeNull();
  });

  // @req REQ-120
  it("returns null when the pool holds only the correct answer repeated", () => {
    expect(
      selectDistractors("Peul", ["Peul", "Peul", "Peul", "Peul"])
    ).toBeNull();
  });
});

describe("correctOptionIndex", () => {
  // @req REQ-120
  it("stays within the four option slots", () => {
    for (const id of ["PPL_YORUBA", "PPL_ZULU", "NGA", "FLG_NIGER_CONGO"]) {
      const index = correctOptionIndex(id, "T1");
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(4);
    }
  });

  // @req REQ-120
  it("is deterministic across repeated calls for the same seed", () => {
    expect(correctOptionIndex("PPL_YORUBA", "T2")).toBe(
      correctOptionIndex("PPL_YORUBA", "T2")
    );
  });

  // @req REQ-120
  it("varies with the discriminator so one entity does not answer in the same slot everywhere", () => {
    const slots = new Set(
      ["T1", "T2", "T3", "T4", "T5"].map((discriminator) =>
        correctOptionIndex("PPL_YORUBA", discriminator)
      )
    );
    expect(slots.size).toBeGreaterThan(1);
  });
});

describe("assembleOptions", () => {
  // @req REQ-120
  it("places the correct answer at the requested index and keeps distractor order", () => {
    const options = assembleOptions("Peul", ["Bantou", "Khoïsan", "Zoulou"], 2);
    expect(options).toEqual(["Bantou", "Khoïsan", "Peul", "Zoulou"]);
  });

  // @req REQ-120
  it("handles the first and last slots", () => {
    expect(assembleOptions("A", ["B", "C", "D"], 0)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect(assembleOptions("A", ["B", "C", "D"], 3)).toEqual([
      "B",
      "C",
      "D",
      "A",
    ]);
  });
});

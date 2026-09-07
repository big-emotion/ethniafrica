import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkKingdomTimeRange } from "../validateAfrikData";

function writeCountry(root: string, id: string, kingdoms: unknown[]) {
  const dir = join(root, "pays");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${id}.json`),
    JSON.stringify({ id, nameFr: id, content: { kingdoms } })
  );
}

describe("checkKingdomTimeRange", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "afrik-timerange-"));
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  // @req REQ-148
  it("accepts a well-formed range", () => {
    writeCountry(root, "TST", [
      {
        name: "Protectorat britannique",
        period: "1894 - 1962",
        entryType: "colonial",
        timeRange: { startYear: 1894, endYear: 1962, precision: "year" },
      },
    ]);
    expect(checkKingdomTimeRange(root).ok).toBe(true);
  });

  // @req REQ-148
  it("says nothing about an entry that carries no bounds yet", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume du Buganda",
        period: "Précolonial - présent",
        entryType: "polity",
      },
    ]);
    const result = checkKingdomTimeRange(root);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // @req REQ-148
  it("rejects a range that ends before it starts", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume test",
        period: "1900 - 1800",
        entryType: "polity",
        timeRange: { startYear: 1900, endYear: 1800, precision: "year" },
      },
    ]);
    const result = checkKingdomTimeRange(root);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/startYear.*endYear|ends before/i);
  });

  // @req REQ-148
  it("rejects a bound that is not a whole year", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume test",
        period: "1900 - 1950",
        entryType: "polity",
        timeRange: { startYear: 1900.5, endYear: 1950, precision: "year" },
      },
    ]);
    expect(checkKingdomTimeRange(root).ok).toBe(false);
  });

  // @req REQ-148
  it("rejects a bound outside the range the corpus can describe", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume test",
        period: "Antiquité",
        entryType: "polity",
        timeRange: { startYear: -50000, endYear: -40000, precision: "year" },
      },
    ]);
    expect(checkKingdomTimeRange(root).ok).toBe(false);
  });

  // @req REQ-148
  it("rejects a precision outside the three the model declares", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume test",
        period: "1900 - 1950",
        entryType: "polity",
        timeRange: { startYear: 1900, endYear: 1950, precision: "circa" },
      },
    ]);
    expect(checkKingdomTimeRange(root).ok).toBe(false);
  });

  /**
   * An estimate that does not say what it estimated is indistinguishable from
   * a measurement, which is the whole failure this field exists to prevent.
   */
  // @req REQ-148
  it("rejects an approximate range that explains nothing", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume test",
        period: "Début XIXe - fin XIXe siècles",
        entryType: "polity",
        timeRange: {
          startYear: 1801,
          endYear: 1900,
          precision: "approximate",
        },
      },
    ]);
    const result = checkKingdomTimeRange(root);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/datingNote/);
  });

  // @req REQ-148
  it("rejects an entity that both still stands and has ended", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume du Buganda",
        period: "XIVe siècle - présent",
        entryType: "polity",
        timeRange: {
          startYear: 1301,
          endYear: 1900,
          ongoing: true,
          precision: "century",
        },
      },
    ]);
    expect(checkKingdomTimeRange(root).ok).toBe(false);
  });

  // @req REQ-148
  it("rejects an entry type outside the three the model declares", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume test",
        period: "1900 - 1950",
        entryType: "kingdom",
        timeRange: { startYear: 1900, endYear: 1950, precision: "year" },
      },
    ]);
    expect(checkKingdomTimeRange(root).ok).toBe(false);
  });

  /**
   * The label and the bounds are two statements about the same entity, and the
   * label is the one the reader sees. They may differ — an editor refining
   * "XIVe siècle" to a sourced 1314 is doing the intended work — but they may
   * not describe disjoint stretches of time.
   */
  // @req REQ-148
  it("rejects bounds that share no time with their own label", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume test",
        period: "1884 - 1960",
        entryType: "colonial",
        timeRange: { startYear: 1200, endYear: 1400, precision: "year" },
      },
    ]);
    const result = checkKingdomTimeRange(root);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/1884 - 1960/);
  });

  // @req REQ-148
  it("accepts an editor refining a century into a sourced year", () => {
    writeCountry(root, "TST", [
      {
        name: "Royaume test",
        period: "XIVe siècle - présent",
        entryType: "polity",
        timeRange: {
          startYear: 1314,
          ongoing: true,
          precision: "approximate",
          datingNote: "Fondation datée de 1314 par la chronique de cour.",
        },
      },
    ]);
    expect(checkKingdomTimeRange(root).ok).toBe(true);
  });

  // @req REQ-148
  it("passes on the real corpus", () => {
    const result = checkKingdomTimeRange(
      join(process.cwd(), "dataset", "source", "afrik")
    );
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

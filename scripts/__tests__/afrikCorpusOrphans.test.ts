import { describe, expect, it } from "vitest";

import { scanCorpusOrphans } from "../lib/afrikCorpusOrphans";

/**
 * The scale actually observed on recette when this guard was written: 14 rows
 * left behind by fiches deleted from the corpus, against 790 the corpus still
 * declares. It anchors the safety cap on a real number rather than a taste.
 */
const RECETTE_SCALE = {
  databaseIds: [
    ...Array.from({ length: 790 }, (_, index) => `PPL_LIVE_${index}`),
    ...Array.from({ length: 14 }, (_, index) => `PPL_GHOST_${index}`),
  ],
  sourceIds: Array.from({ length: 790 }, (_, index) => `PPL_LIVE_${index}`),
};

/** A corpus large enough that a single deletion stays under the safety cap. */
const declaredPeoples = (count: number) =>
  Array.from({ length: count }, (_, index) => `PPL_DECLARED_${index}`);

describe("scanCorpusOrphans", () => {
  // @req REQ-032
  it("flags a row whose fiche no longer exists in the corpus", () => {
    const declared = declaredPeoples(40);
    const scan = scanCorpusOrphans({
      table: "afrik_peoples",
      databaseIds: [...declared, "PPL_KHOZA_FAUXEX"],
      sourceIds: declared,
    });

    expect(scan.orphans).toEqual(["PPL_KHOZA_FAUXEX"]);
    expect(scan.refusal).toBeNull();
  });

  // @req REQ-032
  it("leaves every row the corpus still declares", () => {
    const scan = scanCorpusOrphans({
      table: "afrik_peoples",
      databaseIds: ["PPL_WOLOF", "PPL_YORUBA"],
      sourceIds: ["PPL_YORUBA", "PPL_WOLOF", "PPL_IGBO"],
    });

    expect(scan.orphans).toEqual([]);
    expect(scan.refusal).toBeNull();
  });

  // @req REQ-032
  it("refuses deletion when the corpus loaded nothing", () => {
    const scan = scanCorpusOrphans({
      table: "afrik_peoples",
      databaseIds: ["PPL_WOLOF", "PPL_YORUBA"],
      sourceIds: [],
    });

    expect(scan.orphans).toEqual(["PPL_WOLOF", "PPL_YORUBA"]);
    expect(scan.refusal).toMatch(/corpus/i);
  });

  // @req REQ-032
  it("refuses deletion when the orphan share exceeds the safety cap", () => {
    const scan = scanCorpusOrphans({
      table: "afrik_peoples",
      databaseIds: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      sourceIds: ["A", "B", "C", "D", "E"],
    });

    expect(scan.orphans).toHaveLength(5);
    expect(scan.refusal).toMatch(/50\.0%/);
  });

  // @req REQ-032
  it("authorises deletion at the scale recette actually drifted to", () => {
    const scan = scanCorpusOrphans({
      table: "afrik_peoples",
      ...RECETTE_SCALE,
    });

    expect(scan.orphans).toHaveLength(14);
    expect(scan.refusal).toBeNull();
  });

  // @req REQ-032
  it("names the table it refused on, so a report says which sync step stopped", () => {
    const scan = scanCorpusOrphans({
      table: "afrik_countries",
      databaseIds: ["SEN"],
      sourceIds: [],
    });

    expect(scan.refusal).toContain("afrik_countries");
  });
});

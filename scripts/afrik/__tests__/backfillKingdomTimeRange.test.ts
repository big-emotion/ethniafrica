import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  backfillCountryKingdoms,
  runKingdomBackfill,
} from "../backfillKingdomTimeRange";

function fiche(kingdoms: unknown[]) {
  return { id: "TST", nameFr: "Testland", content: { kingdoms } };
}

describe("backfillCountryKingdoms", () => {
  // @req REQ-148
  it("types every entry and dates the ones whose label carries bounds", () => {
    const { fiche: out, report } = backfillCountryKingdoms(
      fiche([
        { name: "Royaume du Buganda", period: "Précolonial - présent" },
        { name: "Protectorat britannique", period: "1894 - 1962" },
      ])
    );
    const entries = out.content.kingdoms as Record<string, unknown>[];
    expect(entries[0].entryType).toBe("polity");
    expect(entries[1].entryType).toBe("colonial");
    expect(entries[0].timeRange).toBeUndefined();
    expect(entries[1].timeRange).toEqual({
      startYear: 1894,
      endYear: 1962,
      precision: "year",
    });
    expect(report.dated).toBe(1);
    expect(report.undated).toEqual([
      { name: "Royaume du Buganda", period: "Précolonial - présent" },
    ]);
  });

  // @req REQ-148
  it("is idempotent — a second pass changes nothing", () => {
    const first = backfillCountryKingdoms(
      fiche([{ name: "Colonie du Niger", period: "1890 - 1960" }])
    );
    expect(first.changed).toBe(true);
    const second = backfillCountryKingdoms(first.fiche);
    expect(second.changed).toBe(false);
    expect(second.fiche).toEqual(first.fiche);
  });

  /**
   * An editor who dated a polity by hand outranks the parser. Overwriting that
   * would silently undo the exact work this backfill exists to make possible.
   */
  // @req REQ-148
  it("never overwrites bounds an editor already wrote", () => {
    const edited = fiche([
      {
        name: "Royaume du Buganda",
        period: "Précolonial - présent",
        entryType: "polity",
        timeRange: {
          startYear: 1300,
          ongoing: true,
          precision: "approximate",
          datingNote: "Fondation située au XIVe siècle par la tradition orale.",
        },
      },
    ]);
    const { fiche: out, changed } = backfillCountryKingdoms(edited);
    const entry = (out.content.kingdoms as Record<string, unknown>[])[0];
    expect(changed).toBe(false);
    expect(entry.timeRange).toEqual({
      startYear: 1300,
      ongoing: true,
      precision: "approximate",
      datingNote: "Fondation située au XIVe siècle par la tradition orale.",
    });
  });

  // @req REQ-148
  it("leaves a fiche without kingdoms untouched", () => {
    const { changed } = backfillCountryKingdoms({
      id: "TST",
      nameFr: "Testland",
      content: {},
    });
    expect(changed).toBe(false);
  });
});

describe("runKingdomBackfill", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "afrik-kingdoms-"));
    mkdirSync(path.join(dir, "pays"), { recursive: true });
    writeFileSync(
      path.join(dir, "pays", "TST.json"),
      JSON.stringify(
        fiche([{ name: "Colonie test", period: "1890 - 1960" }]),
        null,
        2
      ) + "\n"
    );
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /**
   * A corpus-rewriting script that writes by default is one careless invocation
   * away from an unreviewable diff across 54 fiches.
   */
  // @req REQ-148
  it("writes nothing unless asked to", () => {
    const before = readFileSync(path.join(dir, "pays", "TST.json"), "utf8");
    const summary = runKingdomBackfill({ datasetRoot: dir, write: false });
    expect(readFileSync(path.join(dir, "pays", "TST.json"), "utf8")).toBe(
      before
    );
    expect(summary.filesChanged).toBe(1);
  });

  // @req REQ-148
  it("writes the bounds when asked, and keeps the file valid JSON", () => {
    runKingdomBackfill({ datasetRoot: dir, write: true });
    const written = JSON.parse(
      readFileSync(path.join(dir, "pays", "TST.json"), "utf8")
    );
    expect(written.content.kingdoms[0].timeRange.startYear).toBe(1890);
    expect(written.content.kingdoms[0].entryType).toBe("colonial");
  });

  // @req REQ-148
  it("reports the entries an editor still has to date", () => {
    writeFileSync(
      path.join(dir, "pays", "TST.json"),
      JSON.stringify(
        fiche([
          { name: "Royaume test", period: "Précolonial - présent" },
          { name: "Colonie test", period: "1890 - 1960" },
        ]),
        null,
        2
      ) + "\n"
    );
    const summary = runKingdomBackfill({ datasetRoot: dir, write: false });
    expect(summary.entriesTotal).toBe(2);
    expect(summary.datedByParser).toBe(1);
    expect(summary.pending).toEqual([
      {
        countryId: "TST",
        name: "Royaume test",
        period: "Précolonial - présent",
      },
    ]);
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * `public/pays_demographie.csv` is the denominator of FR32: the check divides
 * a people's declared headcount by the country total to test it against the
 * declared share, and the documented remedy for a drift beyond 2 pp is to
 * delete the headcount. A stale total therefore does not read as a stale
 * total — it reads as a wrong headcount, and erases sourced data.
 *
 * The file shipped for months labelled "ONU, UNFPA / 2025" while carrying
 * figures a decade old (Zambia 7.9 M against 21.9 M, Madagascar 13.2 M
 * against 32.7 M, South Africa 47.2 M against 64.8 M). Nothing caught it,
 * because a plausible wrong number is indistinguishable from a right one
 * without going back to the source.
 *
 * So the contract this file can actually hold is provenance, not accuracy:
 * every row names the URL it was read from, and a human can re-check it in
 * one click. That is the only guard that survives the next revision.
 */

const CSV = path.join(process.cwd(), "public", "pays_demographie.csv");
const PAYS_DIR = path.join(process.cwd(), "dataset", "source", "afrik", "pays");

interface CsvRow {
  id_pays: string;
  nom_pays: string;
  population_totale_2025: string;
  source: string;
  source_url: string;
  annee: string;
}

/** Minimal reader for this file's shape: quoted fields, no embedded newlines. */
function readRows(): CsvRow[] {
  const lines = fs.readFileSync(CSV, "utf-8").trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells =
      line.match(/("([^"]*)"|[^,]*)/g)?.filter((_, i) => i % 2 === 0) ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").replace(/^"|"$/g, "");
    });
    return row as unknown as CsvRow;
  });
}

describe("public/pays_demographie.csv — the FR32 denominator", () => {
  // @req REQ-033
  it("carries a resolvable source URL on every row", () => {
    const unsourced = readRows()
      .filter((r) => !/^https:\/\/\S+$/.test(r.source_url ?? ""))
      .map((r) => r.id_pays);

    expect(unsourced).toEqual([]);
  });

  // @req REQ-033
  it("states a positive total and the 2025 reference year on every row", () => {
    const malformed = readRows()
      .filter(
        (r) =>
          !/^\d+$/.test(r.population_totale_2025) ||
          Number(r.population_totale_2025) <= 0 ||
          r.annee !== "2025"
      )
      .map((r) => r.id_pays);

    expect(malformed).toEqual([]);
  });

  // A country fiche whose id is absent from the CSV silently skips FR32
  // entirely — the check warns and moves on, so the gap is a disarmed gate.
  // @req REQ-033
  it("covers every country fiche in the corpus", () => {
    const known = new Set(readRows().map((r) => r.id_pays));
    const uncovered = fs
      .readdirSync(PAYS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .filter((id) => !known.has(id));

    expect(uncovered).toEqual([]);
  });
});

import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";

type CsvRow = Record<string, string>;

const repositoryRoot = resolve(__dirname, "../..");
const familyDirectory = resolve(
  repositoryRoot,
  "dataset/source/afrik/famille_linguistique"
);
const catalogPath = resolve(familyDirectory, "langue_par_famille.csv");
const auditDirectory = resolve(repositoryRoot, "docs/data-audits");
const manifestPath = resolve(
  auditDirectory,
  "language-tier-audit-glottolog-5.3-manifest.csv"
);
const reportPath = resolve(
  auditDirectory,
  "language-tier-audit-glottolog-5.3.md"
);

const expectedCatalogColumns = [
  "id_langue",
  "nom_langue",
  "code_iso_639_3",
  "id_famille",
  "glottocode",
  "source_title",
  "source_url",
  "source_doi",
  "source_tier",
  "source_access_date",
  "source_notes",
];

function readCsv(path: string): CsvRow[] {
  return parse(readFileSync(path, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });
}

describe("Glottolog 5.3 language-tier audit", () => {
  // @req REQ-052
  it("keeps only unique, sourced ISO 639-3 languages assigned to an AFRIK family", () => {
    const header = readFileSync(catalogPath, "utf8").split(/\r?\n/, 1)[0];
    const rows = readCsv(catalogPath);
    const familyIds = new Set(
      readdirSync(familyDirectory)
        .filter((fileName) => /^FLG_[A-Z0-9]+\.json$/.test(fileName))
        .map((fileName) => fileName.replace(/\.json$/, ""))
    );

    expect(header.split(",")).toEqual(expectedCatalogColumns);
    expect(rows.length).toBeGreaterThan(0);

    const isoCodes = new Set<string>();
    const glottocodes = new Set<string>();

    for (const row of rows) {
      expect(row.code_iso_639_3).toMatch(/^[a-z]{3}$/);
      expect(isoCodes.has(row.code_iso_639_3)).toBe(false);
      isoCodes.add(row.code_iso_639_3);

      expect(row.glottocode).toMatch(/^[a-z0-9]{8}$/);
      expect(glottocodes.has(row.glottocode)).toBe(false);
      glottocodes.add(row.glottocode);

      expect(familyIds.has(row.id_famille)).toBe(true);
      expect(row.source_title).toBe("Glottolog 5.3");
      expect(row.source_url).toMatch(
        /^https:\/\/glottolog\.org\/resource\/languoid\/id\//
      );
      expect(row.source_doi).toBe("10.5281/zenodo.18840967");
      expect(row.source_tier).toBe("1");
      expect(row.source_access_date).toBe("2026-07-29");
      expect(row.source_notes.length).toBeGreaterThan(0);
      expect(row.nom_langue).not.toMatch(/√|�/u);
    }
  });

  // @req REQ-052
  it("accounts for every original row and documents every removal", () => {
    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(reportPath)).toBe(true);

    const catalogRows = readCsv(catalogPath);
    const manifestRows = readCsv(manifestPath);
    const report = readFileSync(reportPath, "utf8");

    expect(manifestRows).toHaveLength(120);
    expect(
      new Set(manifestRows.map((row) => row.original_id_langue)).size
    ).toBe(120);
    expect(
      manifestRows.every((row) =>
        ["retained", "removed"].includes(row.decision)
      )
    ).toBe(true);

    const retainedIds = manifestRows
      .filter((row) => row.decision === "retained")
      .map((row) => row.original_id_langue)
      .sort();
    expect(retainedIds).toEqual(catalogRows.map((row) => row.id_langue).sort());

    const removedRows = manifestRows.filter(
      (row) => row.decision === "removed"
    );
    for (const row of removedRows) {
      expect(row.reason.length).toBeGreaterThan(0);
      expect(report).toMatch(
        new RegExp(`\\|\\s*${row.original_id_langue}\\s*\\|`)
      );
    }

    expect(report).toContain(`Retained rows: ${catalogRows.length}`);
    expect(report).toContain(`Removed rows: ${removedRows.length}`);
    expect(report).toContain("Glottolog 5.3: Glottolog database 5.3 as CLDF");
    expect(report).toContain(
      "Harald Hammarström, Robert Forkel, Martin Haspelmath, Sebastian Bank"
    );
    expect(report).toContain("https://zenodo.org/records/18840967");
    expect(report).toContain("10.5281/zenodo.18840967");
    expect(report).toContain("Access date: 2026-07-29");
    expect(report).toContain(
      "The live Supabase `afrik_languages` table contained 0 rows"
    );
    expect(report).toContain(
      "No database deletion or migration was needed or applied"
    );
  });
});

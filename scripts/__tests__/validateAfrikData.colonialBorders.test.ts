import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  checkColonialBorderCr1,
  checkColonialBorderCr2,
} from "../validateAfrikData";

// ─── helpers ──────────────────────────────────────────────────────────────────

const FIXTURES_DIR = join(__dirname, "__fixtures__", "colonial-borders");

function writePaysCsv(csvPath: string, ids: string[]) {
  const header = "id_pays,nom_pays,population_totale_2025,source,annee\n";
  const body = ids
    .map((id) => `${id},"pays test",1000000,"ONU",2025`)
    .join("\n");
  writeFileSync(csvPath, header + body + "\n");
}

function writeConformantLayer(
  datasetRoot: string,
  id = "FRONTIERE_ILLUSTRATIVE"
) {
  const dir = join(datasetRoot, "geo", "colonial_borders");
  mkdirSync(dir, { recursive: true });
  const metadata = readFileSync(
    join(FIXTURES_DIR, "FRONTIERE_ILLUSTRATIVE.json"),
    "utf-8"
  );
  const geometry = readFileSync(
    join(FIXTURES_DIR, "FRONTIERE_ILLUSTRATIVE.geojson"),
    "utf-8"
  );
  writeFileSync(join(dir, `${id}.json`), metadata);
  writeFileSync(join(dir, `${id}.geojson`), geometry);
  return dir;
}

function writeLayer(
  datasetRoot: string,
  id: string,
  metadataOverrides: Record<string, unknown>,
  geometry: unknown = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    ],
  }
) {
  const dir = join(datasetRoot, "geo", "colonial_borders");
  mkdirSync(dir, { recursive: true });
  const metadata = {
    id,
    title_fr: `${id} (illustrative, not data)`,
    reference_period: "1900-1910",
    colonial_powers: ["GHA"],
    geometry_file: `${id}.geojson`,
    simplification_note: "Test fixture",
    sources: [
      {
        reference: "UN test source",
        tier: 1,
        notes: "Test",
      },
    ],
    license: "CC-BY-SA-4.0",
    ...metadataOverrides,
  };
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(metadata));
  if (geometry !== null) {
    writeFileSync(join(dir, `${id}.geojson`), JSON.stringify(geometry));
  }
  return dir;
}

// ─── test suite ───────────────────────────────────────────────────────────────

describe("validateAfrikData – colonial-border checks (CR1-CR2)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── CR1 : checkColonialBorderCr1 ───────────────────────────────────────────

  describe("checkColonialBorderCr1 (CR1)", () => {
    // @req REQ-092
    it("returns ok:true when the colonial_borders directory does not exist", () => {
      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-092
    it("returns ok:true for the conformant illustrative fixture", () => {
      writeConformantLayer(tmpDir);

      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-092
    it("returns ok:false when sources[] is empty (missing Tier 1/2 source)", () => {
      writeLayer(tmpDir, "FRONTIERE_NOSOURCE", { sources: [] });

      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR1"))).toBe(true);
      expect(result.errors.some((e) => e.includes("FRONTIERE_NOSOURCE"))).toBe(
        true
      );
    });

    // @req REQ-092
    it("returns ok:false when a source carries a forbidden tier (3)", () => {
      writeLayer(tmpDir, "FRONTIERE_TIER3", {
        sources: [{ reference: "Some blog post", tier: 3, notes: "" }],
      });

      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR1"))).toBe(true);
    });

    // @req REQ-092
    it("returns ok:false when a source cites a Wikipedia URL directly", () => {
      writeLayer(tmpDir, "FRONTIERE_WIKI", {
        sources: [
          {
            reference: "https://en.wikipedia.org/wiki/Togoland",
            tier: 2,
            notes: "Vérifié via Wikipedia EN + FR",
          },
        ],
      });

      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.includes("CR1") && /wikipedia/i.test(e))
      ).toBe(true);
    });

    // @req REQ-092
    it("returns ok:false when a tier:2 source has no Wikipedia cross-check path in notes", () => {
      writeLayer(tmpDir, "FRONTIERE_TIER2_NONOTES", {
        sources: [
          {
            reference: "Sebald, Peter (1988). Togo 1884-1914.",
            tier: 2,
            notes: "Just an academic book, no cross-check trail",
          },
        ],
      });

      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR1"))).toBe(true);
    });

    // @req REQ-092
    it("returns ok:false when geometry_file does not exist on disk", () => {
      writeLayer(
        tmpDir,
        "FRONTIERE_MISSINGGEO",
        { geometry_file: "does-not-exist.geojson" },
        null
      );

      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR1"))).toBe(true);
    });

    // @req REQ-092
    it("returns ok:false when geometry_file is not a valid GeoJSON FeatureCollection", () => {
      writeLayer(tmpDir, "FRONTIERE_BADGEOJSON", {}, { type: "Point" });

      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR1"))).toBe(true);
    });

    // @req REQ-092
    it("returns ok:false when a Polygon ring is not closed", () => {
      writeLayer(
        tmpDir,
        "FRONTIERE_OPENRING",
        {},
        {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 1],
                  ],
                ],
              },
            },
          ],
        }
      );

      const result = checkColonialBorderCr1(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR1"))).toBe(true);
    });
  });

  // ── CR2 : checkColonialBorderCr2 ───────────────────────────────────────────

  describe("checkColonialBorderCr2 (CR2)", () => {
    let csvPath: string;

    beforeEach(() => {
      csvPath = join(tmpDir, "pays_demographie.csv");
    });

    // @req REQ-093
    it("returns ok:true when the colonial_borders directory does not exist", () => {
      writePaysCsv(csvPath, ["GHA", "TGO"]);

      const result = checkColonialBorderCr2(tmpDir, csvPath);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-093
    it("returns ok:true for the conformant illustrative fixture", () => {
      writePaysCsv(csvPath, ["GHA", "TGO"]);
      writeConformantLayer(tmpDir);

      const result = checkColonialBorderCr2(tmpDir, csvPath);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-093
    it("returns ok:false when colonial_powers contains an unknown ISO code", () => {
      writePaysCsv(csvPath, ["GHA", "TGO"]);
      writeLayer(tmpDir, "FRONTIERE_UNKNOWNISO", {
        colonial_powers: ["ZZZ"],
      });

      const result = checkColonialBorderCr2(tmpDir, csvPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR2"))).toBe(true);
      expect(result.errors.some((e) => e.includes("ZZZ"))).toBe(true);
    });

    // @req REQ-093
    it("returns ok:false when colonial_powers contains a malformed code", () => {
      writePaysCsv(csvPath, ["GHA", "TGO"]);
      writeLayer(tmpDir, "FRONTIERE_MALFORMEDISO", {
        colonial_powers: ["gh"],
      });

      const result = checkColonialBorderCr2(tmpDir, csvPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR2"))).toBe(true);
    });
  });
});

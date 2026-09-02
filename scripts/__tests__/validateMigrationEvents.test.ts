// @req REQ-080
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
  readFileSync,
} from "fs";
import { join } from "path";
import { validateMigrationEvents } from "../validateAfrikData";

// ─── helpers ──────────────────────────────────────────────────────────────────

const MODEL = {
  _meta: {
    format: "AFRIK JSON v2",
    entity: "migration",
    directives: [
      "Never invent dates, paths, or peoples — every claim cites a Tier 1/2 source or is dropped",
      "classificationStatus is mandatory; contested events cite at least 2 sources",
      "Years are astronomical integers: negative values are BCE (e.g. -1500), positive values are CE",
      "Geometry is schematic (corridor-level), never a claim of precise historical borders",
    ],
    eventTypeEnum: [
      "expansion",
      "trade_route",
      "forced_displacement",
      "pastoral_movement",
      "fragmentation",
      "displacement",
      "imposed_name",
      "resistance",
    ],
  },
  id: "MGR_XXXXX",
  nameMain: "<placeholder>",
  migrationGroup: "<placeholder>",
  eventType: "expansion",
  classificationStatus: "consensual",
  timeRange: { startYear: 0, endYear: 0, datingNote: null },
  geometry: { type: "LineString", coordinates: [] },
  peoplesInvolved: [{ id: "PPL_XXXXX", role: "origin" }],
  content: {
    summary: "<placeholder>",
    narrative: "<placeholder>",
    debate: null,
    sources: [
      { title: "<t>", url: "<u>", year: 0, tier: "official", notes: "" },
    ],
  },
};

function writeModel(root: string) {
  const modelPath = join(root, "modele-migration.json");
  writeFileSync(modelPath, JSON.stringify(MODEL));
  return modelPath;
}

function writePpl(root: string, flgFolder: string, pplId: string) {
  const dir = join(root, "peuples", flgFolder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${pplId}.json`), JSON.stringify({ id: pplId }));
}

function validFiche(overrides: Record<string, unknown> = {}) {
  return {
    id: "MGR_BANTU_PHASE_1",
    nameMain: "Expansion bantoue, phase 1",
    migrationGroup: "bantu-expansion",
    eventType: "expansion",
    classificationStatus: "consensual",
    timeRange: { startYear: -1500, endYear: -500, datingNote: null },
    geometry: {
      type: "LineString",
      coordinates: [
        [10, 5],
        [20, 10],
      ],
    },
    peoplesInvolved: [{ id: "PPL_TEST", role: "origin" }],
    content: {
      summary: "Résumé.",
      narrative: "Récit.",
      debate: null,
      sources: [
        {
          title: "T",
          url: "https://un.org/x",
          year: 2000,
          tier: "official",
          notes: "",
        },
      ],
    },
    ...overrides,
  };
}

function writeFiche(
  root: string,
  fileName: string,
  fiche: Record<string, unknown>
) {
  const dir = join(root, "migrations");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(fiche));
}

// ─── test suite ───────────────────────────────────────────────────────────────

describe("validateMigrationEvents (FR80, Story 12.1)", () => {
  let tmpDir: string;
  let modelPath: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
    modelPath = writeModel(tmpDir);
    writePpl(tmpDir, "FLG_BANTU", "PPL_TEST");
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // @req REQ-080
  it("returns ok:true and no errors for a fully valid fiche", () => {
    writeFiche(tmpDir, "MGR_BANTU_PHASE_1.json", validFiche());

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // @req REQ-080
  it("returns ok:true when the migrations/ directory does not exist", () => {
    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(true);
  });

  // @req REQ-080
  it("reports a distinct error for a missing classificationStatus", () => {
    const fiche = validFiche();
    delete (fiche as Record<string, unknown>).classificationStatus;
    writeFiche(tmpDir, "bad.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("bad.json") && e.includes("classificationStatus")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("reports an error when a contested event cites fewer than 2 sources", () => {
    const fiche = validFiche({
      classificationStatus: "contested",
      timeRange: {
        startYear: -1500,
        endYear: -500,
        datingNote: "Debated dating.",
      },
      content: {
        ...validFiche().content,
        debate: "Scholars disagree on the timeline.",
        sources: [
          {
            title: "T",
            url: "https://un.org/x",
            year: 2000,
            tier: "official",
            notes: "",
          },
        ],
      },
    });
    writeFiche(tmpDir, "bad.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("bad.json") && e.includes("at least 2 sources")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("reports an error when startYear is after endYear", () => {
    const fiche = validFiche({
      timeRange: { startYear: -500, endYear: -1500, datingNote: null },
    });
    writeFiche(tmpDir, "bad.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("bad.json") && e.includes("startYear")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("reports an error when a peoplesInvolved id does not resolve to an existing PPL fiche", () => {
    const fiche = validFiche({
      peoplesInvolved: [{ id: "PPL_UNKNOWN", role: "origin" }],
    });
    writeFiche(tmpDir, "bad.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("bad.json") && e.includes("PPL_UNKNOWN")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("reports an error for invalid GeoJSON geometry", () => {
    const fiche = validFiche({
      geometry: { type: "LineString", coordinates: [] },
    });
    writeFiche(tmpDir, "bad.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("bad.json") && e.includes("geometry")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("reports an error for a sources entry missing tier", () => {
    const fiche = validFiche({
      content: {
        ...validFiche().content,
        sources: [
          { title: "T", url: "https://un.org/x", year: 2000, notes: "" },
        ],
      },
    });
    writeFiche(tmpDir, "bad.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes("bad.json") && e.includes("tier"))
    ).toBe(true);
  });

  // @req REQ-080
  it("reports each of six distinct violations in a single fixture", () => {
    const fiche = validFiche({
      classificationStatus: "contested", // missing 2nd source + datingNote + debate
      timeRange: { startYear: -500, endYear: -1500, datingNote: null }, // startYear > endYear
      peoplesInvolved: [{ id: "PPL_UNKNOWN", role: "origin" }], // unknown PPL id
      geometry: { type: "LineString", coordinates: [] }, // invalid GeoJSON
      content: {
        summary: "S",
        narrative: "N",
        debate: null, // missing debate for contested
        sources: [
          { title: "T", url: "https://un.org/x", year: 2000, notes: "" },
        ], // missing tier
      },
    });
    writeFiche(tmpDir, "multi.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(6);
  });

  // @req REQ-080
  it("reports an error for a duplicate migration id across fiches", () => {
    writeFiche(tmpDir, "one.json", validFiche({ id: "MGR_DUP" }));
    writeFiche(tmpDir, "two.json", validFiche({ id: "MGR_DUP" }));

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true);
  });

  // @req REQ-080
  it("reports an error for an eventType not in the model's allowed set", () => {
    const fiche = validFiche({ eventType: "colonization" });
    writeFiche(tmpDir, "bad.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("bad.json") && e.includes("eventType")
      )
    ).toBe(true);
  });

  // @req REQ-080
  // ETNI-525 (Story 13.1) — fixture per colonization event type, synthetic
  // (fictional) content only, no real ethnographic claims.
  describe.each([
    "fragmentation",
    "displacement",
    "imposed_name",
    "resistance",
  ])("colonization eventType %s", (eventType) => {
    // @req REQ-080
    it("passes validation for a fiche using this new event type", () => {
      const fiche = validFiche({
        id: `MGR_FIXTURE_${eventType.toUpperCase()}`,
        eventType,
      });
      writeFiche(tmpDir, `${eventType}.json`, fiche);

      const result = validateMigrationEvents(tmpDir, modelPath);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // @req REQ-080
  it("still hard-errors for an unknown eventType after the colonization types are added", () => {
    const fiche = validFiche({ eventType: "totally_unknown_type" });
    writeFiche(tmpDir, "unknown-type.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("unknown-type.json") && e.includes("eventType")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("reports an error when fiche keys don't match the model (invented section)", () => {
    const fiche = { ...validFiche(), extraSection: "not allowed" };
    writeFiche(tmpDir, "bad.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes("bad.json") && e.includes("keys"))
    ).toBe(true);
  });

  // @req REQ-080
  it("warns (not errors) when geometry coordinates fall outside the Africa bbox", () => {
    const fiche = validFiche({
      geometry: {
        type: "LineString",
        coordinates: [
          [10, 5],
          [150, 60],
        ],
      },
    });
    writeFiche(tmpDir, "far.json", fiche);

    const result = validateMigrationEvents(tmpDir, modelPath);
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("bbox"))).toBe(true);
  });
});

describe("validateMigrationEvents (FR80, real pilot corpus, Story 12.2)", () => {
  const realDatasetRoot = join(__dirname, "../../dataset/source/afrik");
  const realModelPath = join(__dirname, "../../public/modele-migration.json");

  // @req REQ-080
  it("finds the pilot corpus with at least one fiche per required event type", () => {
    const migrationsDir = join(realDatasetRoot, "migrations");
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);

    const eventTypes = files.map((file) => {
      const fiche = JSON.parse(
        readFileSync(join(migrationsDir, file), "utf-8")
      );
      return fiche.eventType;
    });
    expect(eventTypes).toContain("expansion");
    expect(eventTypes).toContain("trade_route");
  });

  // @req REQ-080
  it("reports zero errors for the real dataset/source/afrik/migrations corpus", () => {
    const result = validateMigrationEvents(realDatasetRoot, realModelPath);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

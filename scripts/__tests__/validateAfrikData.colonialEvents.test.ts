// @req REQ-088
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  checkColonialEventCr3,
  checkColonialEventCr4,
  checkColonialEventCr5,
} from "../validateAfrikData";

// ─── helpers ──────────────────────────────────────────────────────────────────

function writePpl(root: string, flgFolder: string, pplId: string) {
  const dir = join(root, "peuples", flgFolder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${pplId}.json`), JSON.stringify({ id: pplId }));
}

function writeNameRecord(
  root: string,
  pplId: string,
  overrides: Record<string, unknown> = {}
) {
  const dir = join(root, "noms");
  mkdirSync(dir, { recursive: true });
  const record = {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "nom",
      directives: "Voir DIRECTIVES-AFRIK.md",
    },
    id: pplId,
    entityType: "people",
    names: [
      {
        nameText: "Nom colonial",
        nameType: "exonym",
        languageOfOrigin: null,
        meaning: null,
        periodLabel: "Période coloniale",
        imposedBy: "Administration coloniale",
        impositionPeriod: "XIXe siècle",
        whyProblematic: "Terme perçu comme réducteur.",
        contemporaryUsage: null,
        sortRank: 0,
        sources: [
          {
            title: "Glottolog",
            author: "Max Planck Institute",
            year: 2024,
            url: "https://glottolog.org/x",
            tier: "official",
            notes: "",
          },
        ],
      },
    ],
    ...overrides,
  };
  writeFileSync(join(dir, `${pplId}.json`), JSON.stringify(record));
}

function validColonialFiche(
  eventType: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `MGR_TEST_${eventType.toUpperCase()}`,
    nameMain: "Fiche de test",
    migrationGroup: null,
    eventType,
    classificationStatus: "consensual",
    timeRange: { startYear: 1880, endYear: 1900, datingNote: null },
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

describe("validateAfrikData – colonial-event checks (CR3-CR5)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_ce_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
    writePpl(tmpDir, "FLG_TEST", "PPL_TEST");
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── CR3 : checkColonialEventCr3 ────────────────────────────────────────────

  describe("checkColonialEventCr3 (imposed_name → Epic 8 name record)", () => {
    // @req REQ-088
    it("returns ok:true when the migrations directory does not exist", () => {
      const result = checkColonialEventCr3(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-088
    it("passes when an imposed_name event references a PPL id with an existing name record", () => {
      writeNameRecord(tmpDir, "PPL_TEST");
      writeFiche(tmpDir, "imposed.json", validColonialFiche("imposed_name"));

      const result = checkColonialEventCr3(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-088
    it("rejects an imposed_name event whose peoplesInvolved has no Epic 8 name record", () => {
      writeFiche(tmpDir, "imposed.json", validColonialFiche("imposed_name"));

      const result = checkColonialEventCr3(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) => e.includes("CR3") && e.includes("imposed.json")
        )
      ).toBe(true);
    });

    // @req REQ-088
    it("rejects an imposed_name event whose referenced PPL has a name record with no imposed entry", () => {
      writeNameRecord(tmpDir, "PPL_TEST", {
        names: [
          {
            nameText: "Yorùbá",
            nameType: "endonym",
            languageOfOrigin: null,
            meaning: null,
            periodLabel: "Usage contemporain",
            imposedBy: null,
            impositionPeriod: null,
            whyProblematic: null,
            contemporaryUsage: null,
            sortRank: 0,
            sources: [
              {
                title: "Ethnologue",
                author: "SIL International",
                year: 2024,
                url: "https://ethnologue.com/x",
                tier: "official",
                notes: "",
              },
            ],
          },
        ],
      });
      writeFiche(tmpDir, "imposed.json", validColonialFiche("imposed_name"));

      const result = checkColonialEventCr3(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR3"))).toBe(true);
    });

    // @req REQ-088
    it("does not require a name record for non-imposed_name events", () => {
      writeFiche(tmpDir, "resistance.json", validColonialFiche("resistance"));

      const result = checkColonialEventCr3(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── CR4 : checkColonialEventCr4 ────────────────────────────────────────────

  describe("checkColonialEventCr4 (Tier 1/2 source gate)", () => {
    // @req REQ-089
    it("passes a fully sourced consensual event", () => {
      writeFiche(
        tmpDir,
        "fragmentation.json",
        validColonialFiche("fragmentation")
      );

      const result = checkColonialEventCr4(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-089
    it("errors when an event has zero Tier 1/2 sources", () => {
      const fiche = validColonialFiche("displacement", {
        content: {
          summary: "S",
          narrative: "N",
          debate: null,
          sources: [],
        },
      });
      writeFiche(tmpDir, "displacement.json", fiche);

      const result = checkColonialEventCr4(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR4"))).toBe(true);
    });

    // @req REQ-089
    it("rejects a Wikipedia URL cited directly as a source", () => {
      const fiche = validColonialFiche("resistance", {
        content: {
          summary: "S",
          narrative: "N",
          debate: null,
          sources: [
            {
              title: "Wikipedia article",
              url: "https://en.wikipedia.org/wiki/Some_event",
              year: 2020,
              tier: "referenced",
              notes: "Vérifié via Wikipedia EN + FR",
            },
          ],
        },
      });
      writeFiche(tmpDir, "resistance.json", fiche);

      const result = checkColonialEventCr4(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.includes("CR4") && /wikipedia/i.test(e))
      ).toBe(true);
    });

    // @req REQ-089
    it("errors when a contested event cites fewer than 2 valid sources", () => {
      const fiche = validColonialFiche("fragmentation", {
        classificationStatus: "contested",
        timeRange: {
          startYear: 1880,
          endYear: 1900,
          datingNote: "Débattu.",
        },
        content: {
          summary: "S",
          narrative: "N",
          debate: "Débat historiographique.",
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
      writeFiche(tmpDir, "contested.json", fiche);

      const result = checkColonialEventCr4(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.includes("CR4") && e.includes("at least 2"))
      ).toBe(true);
    });

    // @req REQ-089
    it("errors when a colonial-legacy event cites fewer than 2 valid sources", () => {
      const fiche = validColonialFiche("imposed_name", {
        classificationStatus: "colonial-legacy",
      });
      writeFiche(tmpDir, "legacy.json", fiche);

      const result = checkColonialEventCr4(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.includes("CR4") && e.includes("at least 2"))
      ).toBe(true);
    });

    // @req REQ-089
    it("passes a contested event with 2 valid sources", () => {
      const fiche = validColonialFiche("fragmentation", {
        classificationStatus: "contested",
        timeRange: {
          startYear: 1880,
          endYear: 1900,
          datingNote: "Débattu.",
        },
        content: {
          summary: "S",
          narrative: "N",
          debate: "Débat historiographique.",
          sources: [
            {
              title: "T1",
              url: "https://un.org/x",
              year: 2000,
              tier: "official",
              notes: "",
            },
            {
              title: "T2",
              url: "https://researchgate.net/x",
              year: 2001,
              tier: "referenced",
              notes: "Vérifié via Wikipedia EN + FR",
            },
          ],
        },
      });
      writeFiche(tmpDir, "contested-ok.json", fiche);

      const result = checkColonialEventCr4(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-089
    it("errors when a Tier 2 source has no Wikipedia cross-check path in notes", () => {
      const fiche = validColonialFiche("displacement", {
        content: {
          summary: "S",
          narrative: "N",
          debate: null,
          sources: [
            {
              title: "T",
              url: "https://researchgate.net/x",
              year: 2001,
              tier: "referenced",
              notes: "Just an academic paper",
            },
          ],
        },
      });
      writeFiche(tmpDir, "notier2notes.json", fiche);

      const result = checkColonialEventCr4(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("CR4"))).toBe(true);
    });

    // @req REQ-089
    it("ignores non-colonial event types", () => {
      const fiche = validColonialFiche("expansion", {
        content: {
          summary: "S",
          narrative: "N",
          debate: null,
          sources: [],
        },
      });
      writeFiche(tmpDir, "expansion.json", fiche);

      const result = checkColonialEventCr4(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── CR5 : checkColonialEventCr5 ────────────────────────────────────────────

  describe("checkColonialEventCr5 (structural completeness)", () => {
    // @req REQ-090
    it("passes a fully populated colonial event", () => {
      writeFiche(
        tmpDir,
        "fragmentation.json",
        validColonialFiche("fragmentation")
      );

      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-090
    it("errors once for a missing timeRange (no years, no datingNote)", () => {
      const fiche = validColonialFiche("displacement", {
        timeRange: { startYear: null, endYear: null, datingNote: null },
      });
      writeFiche(tmpDir, "notime.json", fiche);

      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.includes("CR5") && e.includes("timeRange"))
      ).toBe(true);
    });

    // @req REQ-090
    it("passes when timeRange has no years but a non-empty datingNote", () => {
      const fiche = validColonialFiche("displacement", {
        timeRange: { startYear: null, endYear: null, datingNote: "Vers 1890" },
      });
      writeFiche(tmpDir, "datingnote.json", fiche);

      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-090
    it("errors for missing/invalid geometry", () => {
      const fiche = validColonialFiche("resistance", {
        geometry: { type: "LineString", coordinates: [] },
      });
      writeFiche(tmpDir, "nogeo.json", fiche);

      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.includes("CR5") && e.includes("geometry"))
      ).toBe(true);
    });

    // @req REQ-090
    it("errors for an empty peoplesInvolved", () => {
      const fiche = validColonialFiche("fragmentation", {
        peoplesInvolved: [],
      });
      writeFiche(tmpDir, "nopeoples.json", fiche);

      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) => e.includes("CR5") && e.includes("peoplesInvolved")
        )
      ).toBe(true);
    });

    // @req REQ-090
    it("errors for a peoplesInvolved entry with an unknown PPL id", () => {
      const fiche = validColonialFiche("resistance", {
        peoplesInvolved: [{ id: "PPL_UNKNOWN", role: "origin" }],
      });
      writeFiche(tmpDir, "unknownppl.json", fiche);

      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) => e.includes("CR5") && e.includes("PPL_UNKNOWN")
        )
      ).toBe(true);
    });

    // @req REQ-090
    it("errors for a missing or invalid classificationStatus", () => {
      const fiche = validColonialFiche("displacement", {
        classificationStatus: "not-a-real-status",
      });
      writeFiche(tmpDir, "badstatus.json", fiche);

      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) => e.includes("CR5") && e.includes("classificationStatus")
        )
      ).toBe(true);
    });

    // @req REQ-090
    it("does not fail merely because a colonial event type has zero fiches", () => {
      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-090
    it("ignores non-colonial event types", () => {
      const fiche = validColonialFiche("expansion", {
        peoplesInvolved: [],
        geometry: { type: "LineString", coordinates: [] },
      });
      writeFiche(tmpDir, "expansion.json", fiche);

      const result = checkColonialEventCr5(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe("validateAfrikData – colonial-event checks (real corpus, Story 13.4)", () => {
  const realDatasetRoot = join(__dirname, "../../dataset/source/afrik");

  // @req REQ-088 @req REQ-089 @req REQ-090
  it("reports zero errors for CR3-CR5 against the real dataset/source/afrik/migrations corpus", () => {
    expect(checkColonialEventCr3(realDatasetRoot).errors).toEqual([]);
    expect(checkColonialEventCr4(realDatasetRoot).errors).toEqual([]);
    expect(checkColonialEventCr5(realDatasetRoot).errors).toEqual([]);
  });
});

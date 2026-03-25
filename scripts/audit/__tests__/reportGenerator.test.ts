import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  AuditReport,
  FileAuditResult,
  AuditSummary,
  CrossLayerGap,
} from "../types";

// -----------------------------------------------
// Fixture data
// -----------------------------------------------

function makeFile(overrides: Partial<FileAuditResult> = {}): FileAuditResult {
  return {
    filePath: "dataset/source/afrik/pays/BFA.txt",
    entityType: "country",
    entityId: "BFA",
    parseSuccess: true,
    parseErrors: [],
    parseWarnings: [],
    sections: {
      header: "filled",
      historicalNames: "filled",
      kingdoms: "empty",
      majorPeoples: "filled",
      culture: "filled",
      historicalFacts: "missing",
      sources: "filled",
      demographics: "filled",
    },
    completenessPercent: 75,
    grade: "partial",
    ...overrides,
  };
}

function makeSummary(overrides: Partial<AuditSummary> = {}): AuditSummary {
  return {
    totalFiles: 3,
    byType: {
      country: { total: 1, full: 0, partial: 1, empty: 0, parseFailures: 0 },
      people: { total: 1, full: 1, partial: 0, empty: 0, parseFailures: 0 },
      languageFamily: {
        total: 1,
        full: 0,
        partial: 0,
        empty: 0,
        parseFailures: 1,
      },
    },
    ...overrides,
  };
}

function makeGap(overrides: Partial<CrossLayerGap> = {}): CrossLayerGap {
  return {
    layer: "source-parser",
    entityType: "people",
    field: "culture",
    severity: "high",
    description: "Culture section loses nested structure during parsing.",
    ...overrides,
  };
}

function makeReport(overrides: Partial<AuditReport> = {}): AuditReport {
  return {
    generatedAt: "2026-03-25T12:00:00.000Z",
    summary: makeSummary(),
    files: [
      makeFile(),
      makeFile({
        filePath: "dataset/source/afrik/peuples/FLG_BANTU/PPL_ZULU.txt",
        entityType: "people",
        entityId: "PPL_ZULU",
        completenessPercent: 100,
        grade: "full",
        sections: {
          appellations: "filled",
          ethnicities: "filled",
          origins: "filled",
          organization: "filled",
          languages: "filled",
          culture: "filled",
          historicalRole: "filled",
          demography: "filled",
          sources: "filled",
        },
      }),
      makeFile({
        filePath: "dataset/source/afrik/famille_linguistique/FLG_BANTU.txt",
        entityType: "languageFamily",
        entityId: "FLG_BANTU",
        parseSuccess: false,
        parseErrors: ["Missing required header"],
        completenessPercent: 0,
        grade: "empty",
        sections: {
          decolonialHeader: "missing",
          generalInfo: "missing",
          peoples: "missing",
          linguisticCharacteristics: "missing",
          historyAndOrigins: "missing",
          distribution: "missing",
          sources: "missing",
        },
      }),
    ],
    crossLayerGaps: [
      makeGap(),
      makeGap({
        layer: "parser-component",
        entityType: "country",
        field: "historicalFacts",
        severity: "high",
        description: "Historical facts parsed but never displayed.",
      }),
      makeGap({
        layer: "component-source",
        entityType: "country",
        field: "etymology",
        severity: "medium",
        description: "Etymology regex is fragile.",
      }),
      makeGap({
        severity: "low",
        field: "percentageInAfrica",
        entityType: "country",
        description: "Percentage in Africa not extracted.",
      }),
    ],
    ...overrides,
  };
}

function makeEmptyReport(): AuditReport {
  return {
    generatedAt: "2026-03-25T12:00:00.000Z",
    summary: {
      totalFiles: 0,
      byType: {
        country: {
          total: 0,
          full: 0,
          partial: 0,
          empty: 0,
          parseFailures: 0,
        },
        people: {
          total: 0,
          full: 0,
          partial: 0,
          empty: 0,
          parseFailures: 0,
        },
        languageFamily: {
          total: 0,
          full: 0,
          partial: 0,
          empty: 0,
          parseFailures: 0,
        },
      },
    },
    files: [],
    crossLayerGaps: [],
  };
}

// -----------------------------------------------
// Tests
// -----------------------------------------------

describe("reportGenerator", () => {
  // Dynamically import so we can test the module
  let generateJsonReport: typeof import("../reportGenerator").generateJsonReport;
  let generateMarkdownReport: typeof import("../reportGenerator").generateMarkdownReport;
  let writeReports: typeof import("../reportGenerator").writeReports;

  beforeEach(async () => {
    const mod = await import("../reportGenerator");
    generateJsonReport = mod.generateJsonReport;
    generateMarkdownReport = mod.generateMarkdownReport;
    writeReports = mod.writeReports;
  });

  // -------------------------------------------
  // generateJsonReport
  // -------------------------------------------
  describe("generateJsonReport", () => {
    it("produces valid JSON string with all fields", () => {
      const report = makeReport();
      const json = generateJsonReport(report);

      // Must be valid JSON
      const parsed = JSON.parse(json);

      expect(parsed.generatedAt).toBe(report.generatedAt);
      expect(parsed.summary.totalFiles).toBe(3);
      expect(parsed.files).toHaveLength(3);
      expect(parsed.crossLayerGaps).toHaveLength(4);
    });

    it("uses 2-space indentation", () => {
      const report = makeReport();
      const json = generateJsonReport(report);

      // Second line should start with 2 spaces (not 4, not tabs)
      const lines = json.split("\n");
      expect(lines[1]).toMatch(/^ {2}"/);
    });

    it("handles empty report", () => {
      const report = makeEmptyReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.files).toHaveLength(0);
      expect(parsed.crossLayerGaps).toHaveLength(0);
      expect(parsed.summary.totalFiles).toBe(0);
    });
  });

  // -------------------------------------------
  // generateMarkdownReport
  // -------------------------------------------
  describe("generateMarkdownReport", () => {
    it("includes the report title", () => {
      const md = generateMarkdownReport(makeReport());
      expect(md).toContain("# AFRIK Data Pipeline Audit Report");
    });

    it("includes generation date", () => {
      const md = generateMarkdownReport(makeReport());
      expect(md).toContain("Generated: 2026-03-25");
    });

    it("includes summary table with correct headers", () => {
      const md = generateMarkdownReport(makeReport());
      expect(md).toContain("## Summary");
      expect(md).toContain(
        "| Type | Total | Full | Partial | Empty | Parse Failures |"
      );
    });

    it("includes summary rows for each entity type and a total row", () => {
      const md = generateMarkdownReport(makeReport());

      // Country row
      expect(md).toMatch(
        /\|\s*Countries\s*\|\s*1\s*\|\s*0\s*\|\s*1\s*\|\s*0\s*\|\s*0\s*\|/
      );
      // People row
      expect(md).toMatch(
        /\|\s*Peoples\s*\|\s*1\s*\|\s*1\s*\|\s*0\s*\|\s*0\s*\|\s*0\s*\|/
      );
      // Family row
      expect(md).toMatch(
        /\|\s*Families\s*\|\s*1\s*\|\s*0\s*\|\s*0\s*\|\s*0\s*\|\s*1\s*\|/
      );
      // Total row
      expect(md).toMatch(/\|\s*\*\*Total\*\*\s*\|\s*\*\*3\*\*\s*\|/);
    });

    it("includes cross-layer gaps section with severity badges", () => {
      const md = generateMarkdownReport(makeReport());

      expect(md).toContain("## Cross-Layer Gaps");
      // High severity should use red circle
      expect(md).toContain("\uD83D\uDD34");
      // Medium severity should use yellow circle
      expect(md).toContain("\uD83D\uDFE1");
      // Low severity should use green circle
      expect(md).toContain("\uD83D\uDFE2");
    });

    it("includes gap details: layer, field, description", () => {
      const md = generateMarkdownReport(makeReport());

      expect(md).toContain("source-parser");
      expect(md).toContain("culture");
      expect(md).toContain(
        "Culture section loses nested structure during parsing."
      );
    });

    it("includes detail sections per entity type", () => {
      const md = generateMarkdownReport(makeReport());

      expect(md).toContain("## Detail: Countries");
      expect(md).toContain("## Detail: Peoples");
      expect(md).toContain("## Detail: Language Families");
    });

    it("detail tables have correct column headers", () => {
      const md = generateMarkdownReport(makeReport());

      expect(md).toContain(
        "| File | ID | Grade | Completeness | Missing Sections |"
      );
    });

    it("sorts detail entries by completeness ascending (worst first)", () => {
      const report = makeReport({
        files: [
          makeFile({ entityId: "GHA", completenessPercent: 80, grade: "full" }),
          makeFile({
            entityId: "BFA",
            completenessPercent: 25,
            grade: "empty",
          }),
          makeFile({
            entityId: "SEN",
            completenessPercent: 50,
            grade: "partial",
          }),
        ],
        summary: makeSummary({
          byType: {
            country: {
              total: 3,
              full: 1,
              partial: 1,
              empty: 1,
              parseFailures: 0,
            },
            people: {
              total: 0,
              full: 0,
              partial: 0,
              empty: 0,
              parseFailures: 0,
            },
            languageFamily: {
              total: 0,
              full: 0,
              partial: 0,
              empty: 0,
              parseFailures: 0,
            },
          },
        }),
      });

      const md = generateMarkdownReport(report);

      // Extract the Countries detail section
      const countriesSection =
        md.split("## Detail: Countries")[1]?.split("## Detail:")[0] ?? "";

      // BFA (25%) should appear before SEN (50%) which should appear before GHA (80%)
      const bfaIdx = countriesSection.indexOf("BFA");
      const senIdx = countriesSection.indexOf("SEN");
      const ghaIdx = countriesSection.indexOf("GHA");

      expect(bfaIdx).toBeLessThan(senIdx);
      expect(senIdx).toBeLessThan(ghaIdx);
    });

    it("shows missing sections in detail rows", () => {
      const md = generateMarkdownReport(makeReport());

      // The BFA country file has kingdoms=empty and historicalFacts=missing
      // Both should appear in the missing sections column
      expect(md).toMatch(/kingdoms/);
      expect(md).toMatch(/historicalFacts/);
    });

    it("handles empty report gracefully", () => {
      const md = generateMarkdownReport(makeEmptyReport());

      expect(md).toContain("# AFRIK Data Pipeline Audit Report");
      expect(md).toContain("## Summary");
      // Total row shows 0
      expect(md).toMatch(/\|\s*\*\*Total\*\*\s*\|\s*\*\*0\*\*\s*\|/);
      // No gaps message
      expect(md).toContain("No cross-layer gaps detected");
    });
  });

  // -------------------------------------------
  // writeReports
  // -------------------------------------------
  describe("writeReports", () => {
    // Use require for synchronous access in describe block
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const testOutputDir = path.resolve("/tmp/audit-test-output");

    beforeEach(() => {
      // Clean up before each test
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true });
      }
    });

    afterEach(() => {
      // Clean up after each test
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true });
      }
    });

    it("creates the output directory if it does not exist", async () => {
      const report = makeReport();
      await writeReports(report, testOutputDir);

      expect(fs.existsSync(testOutputDir)).toBe(true);
    });

    it("writes audit-report.json with valid JSON content", async () => {
      const report = makeReport();
      await writeReports(report, testOutputDir);

      const jsonPath = path.join(testOutputDir, "audit-report.json");
      expect(fs.existsSync(jsonPath)).toBe(true);

      const content = fs.readFileSync(jsonPath, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.generatedAt).toBe(report.generatedAt);
      expect(parsed.files).toHaveLength(3);
    });

    it("writes AUDIT-SUMMARY.md with markdown content", async () => {
      const report = makeReport();
      await writeReports(report, testOutputDir);

      const mdPath = path.join(testOutputDir, "AUDIT-SUMMARY.md");
      expect(fs.existsSync(mdPath)).toBe(true);

      const content = fs.readFileSync(mdPath, "utf-8");
      expect(content).toContain("# AFRIK Data Pipeline Audit Report");
    });

    it("overwrites existing reports without error", async () => {
      const report = makeReport();

      // Write twice — should not throw
      await writeReports(report, testOutputDir);
      await writeReports(report, testOutputDir);

      const jsonPath = path.join(testOutputDir, "audit-report.json");
      expect(fs.existsSync(jsonPath)).toBe(true);
    });
  });
});

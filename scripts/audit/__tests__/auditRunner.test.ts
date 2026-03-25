import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import {
  isMeaningfulContent,
  computeGrade,
  auditCountryFile,
  auditPeopleFile,
  auditFamilyFile,
  runFullAudit,
} from "../auditRunner";

// -----------------------------------------------
// Test data: read real AFRIK source files
// -----------------------------------------------
const ROOT = path.resolve(__dirname, "../../../");
const COUNTRY_FILE = path.join(ROOT, "dataset/source/afrik/pays/BFA.txt");
const PEOPLE_FILE = path.join(
  ROOT,
  "dataset/source/afrik/peuples/FLG_BANTU/PPL_ZULU.txt"
);
const FAMILY_FILE = path.join(
  ROOT,
  "dataset/source/afrik/famille_linguistique/FLG_BANTU.txt"
);

const countryContent = fs.readFileSync(COUNTRY_FILE, "utf-8");
const peopleContent = fs.readFileSync(PEOPLE_FILE, "utf-8");
const familyContent = fs.readFileSync(FAMILY_FILE, "utf-8");

// -----------------------------------------------
// isMeaningfulContent
// -----------------------------------------------
describe("isMeaningfulContent", () => {
  it("returns false for undefined", () => {
    expect(isMeaningfulContent(undefined)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isMeaningfulContent(null)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMeaningfulContent("")).toBe(false);
    expect(isMeaningfulContent("   ")).toBe(false);
  });

  it('returns false for "N/A" variants', () => {
    expect(isMeaningfulContent("N/A")).toBe(false);
    expect(isMeaningfulContent("n/a")).toBe(false);
    expect(isMeaningfulContent("N / A")).toBe(false);
  });

  it('returns false for "Non applicable"', () => {
    expect(isMeaningfulContent("Non applicable")).toBe(false);
    expect(isMeaningfulContent("non applicable")).toBe(false);
  });

  it('returns false for "A compléter"', () => {
    expect(isMeaningfulContent("A compléter")).toBe(false);
    expect(isMeaningfulContent("À compléter")).toBe(false);
    expect(isMeaningfulContent("a completer")).toBe(false);
  });

  it("returns false for placeholder ellipsis", () => {
    expect(isMeaningfulContent("...")).toBe(false);
    expect(isMeaningfulContent("…")).toBe(false);
  });

  it("returns false for template placeholders like [Titre]", () => {
    expect(isMeaningfulContent("[Titre]")).toBe(false);
    expect(isMeaningfulContent("[À compléter]")).toBe(false);
  });

  it("returns true for real content", () => {
    expect(isMeaningfulContent("Les Zoulous sont originaires de l'est")).toBe(
      true
    );
    expect(isMeaningfulContent("Bantou")).toBe(true);
  });
});

// -----------------------------------------------
// computeGrade
// -----------------------------------------------
describe("computeGrade", () => {
  it("returns 'full' for percent >= 80", () => {
    expect(computeGrade(80)).toBe("full");
    expect(computeGrade(100)).toBe("full");
    expect(computeGrade(95)).toBe("full");
  });

  it("returns 'partial' for percent >= 30 and < 80", () => {
    expect(computeGrade(30)).toBe("partial");
    expect(computeGrade(50)).toBe("partial");
    expect(computeGrade(79)).toBe("partial");
  });

  it("returns 'empty' for percent < 30", () => {
    expect(computeGrade(0)).toBe("empty");
    expect(computeGrade(29)).toBe("empty");
    expect(computeGrade(10)).toBe("empty");
  });
});

// -----------------------------------------------
// auditCountryFile
// -----------------------------------------------
describe("auditCountryFile", () => {
  it("parses a real country file successfully", () => {
    const result = auditCountryFile(COUNTRY_FILE, countryContent);
    expect(result.parseSuccess).toBe(true);
    expect(result.entityType).toBe("country");
    expect(result.entityId).toBe("BFA");
    expect(result.parseErrors).toHaveLength(0);
  });

  it("audits 8 sections for a country file", () => {
    const result = auditCountryFile(COUNTRY_FILE, countryContent);
    const sectionNames = Object.keys(result.sections);
    expect(sectionNames).toContain("header");
    expect(sectionNames).toContain("historicalNames");
    expect(sectionNames).toContain("kingdoms");
    expect(sectionNames).toContain("majorPeoples");
    expect(sectionNames).toContain("culture");
    expect(sectionNames).toContain("historicalFacts");
    expect(sectionNames).toContain("sources");
    expect(sectionNames).toContain("demographics");
    expect(sectionNames).toHaveLength(8);
  });

  it("marks filled sections correctly for BFA", () => {
    const result = auditCountryFile(COUNTRY_FILE, countryContent);
    // BFA is a well-filled country file
    expect(result.sections.header).toBe("filled");
    expect(result.sections.historicalNames).toBe("filled");
    expect(result.sections.kingdoms).toBe("filled");
    expect(result.sections.majorPeoples).toBe("filled");
  });

  it("computes a reasonable completeness grade for BFA", () => {
    const result = auditCountryFile(COUNTRY_FILE, countryContent);
    // BFA is a rich file, should be at least partial
    expect(result.completenessPercent).toBeGreaterThanOrEqual(50);
    expect(["full", "partial"]).toContain(result.grade);
  });

  it("handles unparseable content gracefully", () => {
    const result = auditCountryFile("fake.txt", "garbage content");
    expect(result.parseSuccess).toBe(false);
    expect(result.parseErrors.length).toBeGreaterThan(0);
    expect(result.grade).toBe("empty");
  });
});

// -----------------------------------------------
// auditPeopleFile
// -----------------------------------------------
describe("auditPeopleFile", () => {
  it("parses a real people file successfully", () => {
    const result = auditPeopleFile(PEOPLE_FILE, peopleContent);
    expect(result.parseSuccess).toBe(true);
    expect(result.entityType).toBe("people");
    expect(result.entityId).toBe("PPL_ZULU");
    expect(result.parseErrors).toHaveLength(0);
  });

  it("audits 9 sections for a people file", () => {
    const result = auditPeopleFile(PEOPLE_FILE, peopleContent);
    const sectionNames = Object.keys(result.sections);
    expect(sectionNames).toContain("appellations");
    expect(sectionNames).toContain("ethnicities");
    expect(sectionNames).toContain("origins");
    expect(sectionNames).toContain("organization");
    expect(sectionNames).toContain("languages");
    expect(sectionNames).toContain("culture");
    expect(sectionNames).toContain("historicalRole");
    expect(sectionNames).toContain("demography");
    expect(sectionNames).toContain("sources");
    expect(sectionNames).toHaveLength(9);
  });

  it("marks filled sections correctly for PPL_ZULU", () => {
    const result = auditPeopleFile(PEOPLE_FILE, peopleContent);
    expect(result.sections.appellations).toBe("filled");
    expect(result.sections.ethnicities).toBe("filled");
    expect(result.sections.origins).toBe("filled");
  });

  it("computes a reasonable completeness grade for PPL_ZULU", () => {
    const result = auditPeopleFile(PEOPLE_FILE, peopleContent);
    expect(result.completenessPercent).toBeGreaterThanOrEqual(50);
    expect(["full", "partial"]).toContain(result.grade);
  });

  it("handles unparseable content gracefully", () => {
    const result = auditPeopleFile("fake.txt", "garbage content");
    expect(result.parseSuccess).toBe(false);
    expect(result.parseErrors.length).toBeGreaterThan(0);
    expect(result.grade).toBe("empty");
  });
});

// -----------------------------------------------
// auditFamilyFile
// -----------------------------------------------
describe("auditFamilyFile", () => {
  it("parses a real family file successfully", () => {
    const result = auditFamilyFile(FAMILY_FILE, familyContent);
    expect(result.parseSuccess).toBe(true);
    expect(result.entityType).toBe("languageFamily");
    expect(result.entityId).toBe("FLG_BANTU");
    expect(result.parseErrors).toHaveLength(0);
  });

  it("audits 7 sections for a family file", () => {
    const result = auditFamilyFile(FAMILY_FILE, familyContent);
    const sectionNames = Object.keys(result.sections);
    expect(sectionNames).toContain("decolonialHeader");
    expect(sectionNames).toContain("generalInfo");
    expect(sectionNames).toContain("peoples");
    expect(sectionNames).toContain("linguisticCharacteristics");
    expect(sectionNames).toContain("historyAndOrigins");
    expect(sectionNames).toContain("distribution");
    expect(sectionNames).toContain("sources");
    expect(sectionNames).toHaveLength(7);
  });

  it("marks filled sections correctly for FLG_BANTU", () => {
    const result = auditFamilyFile(FAMILY_FILE, familyContent);
    expect(result.sections.decolonialHeader).toBe("filled");
    expect(result.sections.peoples).toBe("filled");
    expect(result.sections.linguisticCharacteristics).toBe("filled");
    expect(result.sections.historyAndOrigins).toBe("filled");
  });

  it("computes a reasonable completeness grade for FLG_BANTU", () => {
    const result = auditFamilyFile(FAMILY_FILE, familyContent);
    expect(result.completenessPercent).toBeGreaterThanOrEqual(50);
    expect(["full", "partial"]).toContain(result.grade);
  });

  it("handles unparseable content gracefully", () => {
    const result = auditFamilyFile("fake.txt", "garbage content");
    expect(result.parseSuccess).toBe(false);
    expect(result.parseErrors.length).toBeGreaterThan(0);
    expect(result.grade).toBe("empty");
  });
});

// -----------------------------------------------
// runFullAudit
// -----------------------------------------------
describe("runFullAudit", () => {
  it("processes all files and returns AuditReport with correct structure", async () => {
    const { files, summary } = await runFullAudit();

    // Should find files
    expect(files.length).toBeGreaterThan(0);
    expect(summary.totalFiles).toBe(files.length);

    // Summary should have all entity types
    expect(summary.byType.country).toBeDefined();
    expect(summary.byType.people).toBeDefined();
    expect(summary.byType.languageFamily).toBeDefined();
  });

  it("finds the expected approximate number of files", async () => {
    const { summary } = await runFullAudit();

    // Approximate counts from the task description
    expect(summary.byType.country.total).toBeGreaterThanOrEqual(40);
    expect(summary.byType.people.total).toBeGreaterThanOrEqual(500);
    expect(summary.byType.languageFamily.total).toBeGreaterThanOrEqual(15);
  });

  it("counts by type sum to totalFiles", async () => {
    const { summary } = await runFullAudit();

    const sum =
      summary.byType.country.total +
      summary.byType.people.total +
      summary.byType.languageFamily.total;
    expect(sum).toBe(summary.totalFiles);
  });

  it("grade counts sum to total for each type", async () => {
    const { summary } = await runFullAudit();

    for (const entityType of ["country", "people", "languageFamily"] as const) {
      const t = summary.byType[entityType];
      expect(t.full + t.partial + t.empty + t.parseFailures).toBe(t.total);
    }
  });
}, 30000); // 30s timeout for full audit

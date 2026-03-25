/**
 * AFRIK Audit Runner
 *
 * Audits all AFRIK source TXT files for data completeness.
 * Uses existing parsers to check which sections are filled, empty, or missing.
 */

import fs from "fs";
import path from "path";
import { parseCountryFile } from "@/lib/afrik/parsers/countryParser";
import { parsePeopleFile } from "@/lib/afrik/parsers/peopleParser";
import {
  parseLanguageFamilyV2,
  type LanguageFamilyV2,
} from "@/lib/afrik/parsers/languageFamilyParserV2";
import type {
  FileAuditResult,
  AuditSummary,
  FailureAnalysis,
  FailureRootCause,
  EntityType,
  SectionStatus,
  CompletenessGrade,
} from "./types";

// -----------------------------------------------
// Dataset root (relative to project root)
// -----------------------------------------------
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const DATASET_ROOT = path.join(PROJECT_ROOT, "dataset/source/afrik");

// -----------------------------------------------
// Utility: detect meaningful content
// -----------------------------------------------
const PLACEHOLDER_PATTERNS = [
  /^\s*$/,
  /^n\s*\/\s*a$/i,
  /^non\s+applicable$/i,
  /^[àa]\s*compl[eé]ter$/i,
  /^\.{2,}$/,
  /^…$/,
  /^\[.*\]$/, // template placeholders like [Titre], [À compléter]
];

/**
 * Returns false for undefined, null, empty, "N/A", "Non applicable",
 * "A compléter", "...", template placeholders like "[Titre]"
 */
export function isMeaningfulContent(text: string | undefined | null): boolean {
  if (text === undefined || text === null) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }

  return true;
}

/**
 * Compute completeness grade from percentage.
 * >=80 -> 'full', >=30 -> 'partial', <30 -> 'empty'
 */
export function computeGrade(percent: number): CompletenessGrade {
  if (percent >= 80) return "full";
  if (percent >= 30) return "partial";
  return "empty";
}

// -----------------------------------------------
// Helper: check if an object/array has meaningful content
// -----------------------------------------------
function hasContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;

  if (typeof value === "string") return isMeaningfulContent(value);

  if (Array.isArray(value)) return value.length > 0;

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.values(obj).some((v) => hasContent(v));
  }

  if (typeof value === "number") return true;

  return false;
}

/**
 * Determine section status: 'filled', 'empty', or 'missing'
 */
function sectionStatus(value: unknown): SectionStatus {
  if (value === undefined || value === null) return "missing";
  if (hasContent(value)) return "filled";
  return "empty";
}

/**
 * Compute completeness percent from sections record.
 * Counts 'filled' sections as 1, 'empty'/'missing' as 0.
 */
function computeCompleteness(sections: Record<string, SectionStatus>): number {
  const entries = Object.values(sections);
  if (entries.length === 0) return 0;
  const filled = entries.filter((s) => s === "filled").length;
  return Math.round((filled / entries.length) * 100);
}

// -----------------------------------------------
// Country audit
// -----------------------------------------------

/**
 * Audit a country file. Checks 8 sections:
 * header, historicalNames, kingdoms, majorPeoples, culture,
 * historicalFacts, sources, demographics
 */
export function auditCountryFile(
  filePath: string,
  content: string
): FileAuditResult {
  const result = parseCountryFile(content);

  if (!result.success || !result.data) {
    return {
      filePath,
      entityType: "country",
      entityId: extractIdFromPath(filePath, "country"),
      parseSuccess: false,
      parseErrors: (result.errors || []).map((e) => e.message),
      parseWarnings: (result.warnings || []).map((w) => w.message),
      sections: {
        header: "missing",
        historicalNames: "missing",
        kingdoms: "missing",
        majorPeoples: "missing",
        culture: "missing",
        historicalFacts: "missing",
        sources: "missing",
        demographics: "missing",
      },
      completenessPercent: 0,
      grade: "empty",
    };
  }

  const data = result.data;
  const c = data.content;

  const sections: Record<string, SectionStatus> = {
    header:
      data.nameFr && isMeaningfulContent(data.nameFr) ? "filled" : "missing",
    historicalNames: sectionStatus(c.historicalNames),
    kingdoms: sectionStatus(c.kingdoms),
    majorPeoples: sectionStatus(c.majorPeoples),
    culture: sectionStatus(c.culture),
    historicalFacts: sectionStatus(c.historicalFacts),
    sources: sectionStatus(c.sources),
    demographics: sectionStatus(c.demographics),
  };

  const completenessPercent = computeCompleteness(sections);

  return {
    filePath,
    entityType: "country",
    entityId: data.id,
    parseSuccess: true,
    parseErrors: [],
    parseWarnings: (result.warnings || []).map((w) => w.message),
    sections,
    completenessPercent,
    grade: computeGrade(completenessPercent),
  };
}

// -----------------------------------------------
// People audit
// -----------------------------------------------

/**
 * Audit a people file. Checks 9 sections:
 * appellations, ethnicities, origins, organization, languages,
 * culture, historicalRole, demography, sources
 */
export function auditPeopleFile(
  filePath: string,
  content: string
): FileAuditResult {
  const result = parsePeopleFile(content);

  if (!result.success || !result.data) {
    return {
      filePath,
      entityType: "people",
      entityId: extractIdFromPath(filePath, "people"),
      parseSuccess: false,
      parseErrors: (result.errors || []).map((e) => e.message),
      parseWarnings: (result.warnings || []).map((w) => w.message),
      sections: {
        appellations: "missing",
        ethnicities: "missing",
        origins: "missing",
        organization: "missing",
        languages: "missing",
        culture: "missing",
        historicalRole: "missing",
        demography: "missing",
        sources: "missing",
      },
      completenessPercent: 0,
      grade: "empty",
    };
  }

  const data = result.data;
  const c = data.content;

  const sections: Record<string, SectionStatus> = {
    appellations: sectionStatus(c.appellations),
    ethnicities: sectionStatus(c.ethnicities),
    origins: sectionStatus(c.origins),
    organization: sectionStatus(c.organization),
    languages: sectionStatus(c.languages),
    culture: sectionStatus(c.culture),
    historicalRole: sectionStatus(c.historicalRole),
    demography: sectionStatus(c.demography),
    sources: sectionStatus(c.sources),
  };

  const completenessPercent = computeCompleteness(sections);

  return {
    filePath,
    entityType: "people",
    entityId: data.id,
    parseSuccess: true,
    parseErrors: [],
    parseWarnings: (result.warnings || []).map((w) => w.message),
    sections,
    completenessPercent,
    grade: computeGrade(completenessPercent),
  };
}

// -----------------------------------------------
// Language family audit
// -----------------------------------------------

/**
 * Audit a language family file. Checks 7 sections:
 * decolonialHeader, generalInfo, peoples, linguisticCharacteristics,
 * historyAndOrigins, distribution, sources
 *
 * Note: parseLanguageFamilyV2 returns LanguageFamilyV2 directly (or throws).
 */
export function auditFamilyFile(
  filePath: string,
  content: string
): FileAuditResult {
  let data: LanguageFamilyV2;
  try {
    data = parseLanguageFamilyV2(content);
  } catch (error) {
    return {
      filePath,
      entityType: "languageFamily",
      entityId: extractIdFromPath(filePath, "languageFamily"),
      parseSuccess: false,
      parseErrors: [
        error instanceof Error ? error.message : "Unknown parse error",
      ],
      parseWarnings: [],
      sections: {
        decolonialHeader: "missing",
        generalInfo: "missing",
        peoples: "missing",
        linguisticCharacteristics: "missing",
        historyAndOrigins: "missing",
        distribution: "missing",
        sources: "missing",
      },
      completenessPercent: 0,
      grade: "empty",
    };
  }

  const sections: Record<string, SectionStatus> = {
    decolonialHeader: sectionStatus(data.decolonialHeader),
    generalInfo:
      data.name && data.speakers !== null && data.geographicArea.length > 0
        ? "filled"
        : data.name
          ? "empty"
          : "missing",
    peoples: data.peoples.length > 0 ? "filled" : "missing",
    linguisticCharacteristics: sectionStatus(data.linguisticCharacteristics),
    historyAndOrigins: sectionStatus(data.historyAndOrigins),
    distribution: sectionStatus(data.distribution),
    sources: data.sources.length > 0 ? "filled" : "missing",
  };

  const completenessPercent = computeCompleteness(sections);

  return {
    filePath,
    entityType: "languageFamily",
    entityId: data.familyId,
    parseSuccess: true,
    parseErrors: [],
    parseWarnings: [],
    sections,
    completenessPercent,
    grade: computeGrade(completenessPercent),
  };
}

// -----------------------------------------------
// Full audit
// -----------------------------------------------

/**
 * Run a full audit on all AFRIK source files.
 * Globs all files, runs the appropriate audit function, computes summary.
 */
export async function runFullAudit(): Promise<{
  files: FileAuditResult[];
  summary: AuditSummary;
  failureAnalysis: FailureAnalysis;
}> {
  const files: FileAuditResult[] = [];

  // 1. Country files: dataset/source/afrik/pays/*.txt
  const countryDir = path.join(DATASET_ROOT, "pays");
  if (fs.existsSync(countryDir)) {
    const countryFiles = fs
      .readdirSync(countryDir)
      .filter((f) => f.endsWith(".txt"));
    for (const file of countryFiles) {
      const filePath = path.join(countryDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      files.push(auditCountryFile(filePath, content));
    }
  }

  // 2. People files: dataset/source/afrik/peuples/FLG_*/PPL_*.txt
  const peoplesDir = path.join(DATASET_ROOT, "peuples");
  if (fs.existsSync(peoplesDir)) {
    const familyDirs = fs
      .readdirSync(peoplesDir)
      .filter((d) => d.startsWith("FLG_"));
    for (const familyDir of familyDirs) {
      const fullDir = path.join(peoplesDir, familyDir);
      const stat = fs.statSync(fullDir);
      if (!stat.isDirectory()) continue;

      const peopleFiles = fs
        .readdirSync(fullDir)
        .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));
      for (const file of peopleFiles) {
        const filePath = path.join(fullDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        files.push(auditPeopleFile(filePath, content));
      }
    }
  }

  // 3. Language family files: dataset/source/afrik/famille_linguistique/FLG_*.txt
  const familyDir = path.join(DATASET_ROOT, "famille_linguistique");
  if (fs.existsSync(familyDir)) {
    const familyFiles = fs
      .readdirSync(familyDir)
      .filter((f) => f.startsWith("FLG_") && f.endsWith(".txt"));
    for (const file of familyFiles) {
      const filePath = path.join(familyDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      files.push(auditFamilyFile(filePath, content));
    }
  }

  // Compute summary
  const summary = computeSummary(files);

  // Build failure analysis
  const failureAnalysis = buildFailureAnalysis(files);

  return { files, summary, failureAnalysis };
}

// -----------------------------------------------
// Summary computation
// -----------------------------------------------
function computeSummary(files: FileAuditResult[]): AuditSummary {
  const byType: AuditSummary["byType"] = {
    country: { total: 0, full: 0, partial: 0, empty: 0, parseFailures: 0 },
    people: { total: 0, full: 0, partial: 0, empty: 0, parseFailures: 0 },
    languageFamily: {
      total: 0,
      full: 0,
      partial: 0,
      empty: 0,
      parseFailures: 0,
    },
  };

  for (const file of files) {
    const t = byType[file.entityType];
    t.total++;

    if (!file.parseSuccess) {
      t.parseFailures++;
    } else {
      switch (file.grade) {
        case "full":
          t.full++;
          break;
        case "partial":
          t.partial++;
          break;
        case "empty":
          t.empty++;
          break;
      }
    }
  }

  return {
    totalFiles: files.length,
    byType,
  };
}

// -----------------------------------------------
// Failure analysis
// -----------------------------------------------

/**
 * Build a detailed failure analysis with root causes.
 * Groups failures by error message and analyzes the underlying reason.
 */
function buildFailureAnalysis(files: FileAuditResult[]): FailureAnalysis {
  const failures = files.filter((f) => !f.parseSuccess);

  const byEntityType: Record<EntityType, number> = {
    country: 0,
    people: 0,
    languageFamily: 0,
  };
  failures.forEach((f) => byEntityType[f.entityType]++);

  // Group by error message
  const errorGroups: Record<string, FileAuditResult[]> = {};
  for (const f of failures) {
    for (const err of f.parseErrors) {
      if (!errorGroups[err]) errorGroups[err] = [];
      errorGroups[err].push(f);
    }
  }

  const rootCauses: FailureRootCause[] = [];

  for (const [error, affectedFiles] of Object.entries(errorGroups)) {
    // Analyze per-directory breakdown for people files
    const byDirectory: Record<
      string,
      { count: number; textValue: string; expectedValue: string }
    > = {};

    for (const f of affectedFiles) {
      const parts = f.filePath.split(path.sep);
      const parentDir = parts.length >= 2 ? parts[parts.length - 2] : "unknown";

      if (!byDirectory[parentDir]) {
        // Read file to find what text was used instead of the expected ID
        let textValue = "unknown";
        try {
          const content = fs.readFileSync(f.filePath, "utf-8");
          const familyMatch = content.match(/Famille linguistique.*?:\s*(.+)/i);
          textValue = familyMatch ? familyMatch[1].trim() : "not found";
        } catch {
          // Ignore read errors
        }
        byDirectory[parentDir] = {
          count: 0,
          textValue,
          expectedValue: parentDir, // e.g. FLG_ATLANTIQUE
        };
      }
      byDirectory[parentDir].count++;
    }

    // Determine description based on error pattern
    let description: string;
    let fix: string;

    if (error.includes("FLG_xxxxx")) {
      description =
        'Files use human-readable family names (e.g., "Niger-Congo - Atlantique") ' +
        "instead of FLG_ identifiers (e.g., FLG_ATLANTIQUE) in the " +
        '"Famille linguistique principale" header field. The parser\'s ' +
        "extractRelations() searches for /FLG_[A-Z_]+/ regex pattern " +
        "which only matches the FLG_ prefix format. The correct FLG_ ID " +
        "can be inferred from the parent directory name.";
      fix =
        "Option A (fix sources): Add (FLG_XXXX) to the family line in all 138 files — " +
        "the ID is the parent directory name. " +
        "Option B (fix parser): Add fallback in extractRelations() to infer FLG_ ID " +
        "from the file path when not found in content. " +
        "Recommended: Both — fix parser for robustness, fix sources for self-containedness.";
    } else {
      description = `Parse error: ${error}`;
      fix =
        "Investigate the source files and parser to determine the root cause.";
    }

    rootCauses.push({
      error,
      count: affectedFiles.length,
      description,
      affectedFamilies: Object.entries(byDirectory)
        .map(([directory, data]) => ({
          directory,
          count: data.count,
          textValue: data.textValue,
          expectedValue: data.expectedValue,
        }))
        .sort((a, b) => b.count - a.count),
      fix,
    });
  }

  return {
    totalFailures: failures.length,
    byEntityType,
    rootCauses: rootCauses.sort((a, b) => b.count - a.count),
  };
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

/**
 * Extract entity ID from file path as fallback when parsing fails.
 */
function extractIdFromPath(filePath: string, entityType: EntityType): string {
  const basename = path.basename(filePath, ".txt");

  switch (entityType) {
    case "country":
      return basename; // e.g. "BFA"
    case "people":
      return basename; // e.g. "PPL_ZULU"
    case "languageFamily":
      return basename; // e.g. "FLG_BANTU"
    default:
      return basename;
  }
}

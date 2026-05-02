/**
 * AFRIK Audit Report Generator
 *
 * Generates JSON and Markdown reports from audit results.
 */

import fs from "fs";
import path from "path";
import type {
  AuditReport,
  FileAuditResult,
  AuditSummary,
  CrossLayerGap,
  EntityType,
} from "./types";

// -----------------------------------------------
// Severity emoji mapping
// -----------------------------------------------
const SEVERITY_EMOJI: Record<string, string> = {
  high: "\uD83D\uDD34",
  medium: "\uD83D\uDFE1",
  low: "\uD83D\uDFE2",
};

// -----------------------------------------------
// Entity type display names
// -----------------------------------------------
const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  country: "Countries",
  people: "Peoples",
  languageFamily: "Families",
};

const ENTITY_TYPE_DETAIL_LABELS: Record<EntityType, string> = {
  country: "Countries",
  people: "Peoples",
  languageFamily: "Language Families",
};

// -----------------------------------------------
// JSON report
// -----------------------------------------------

/**
 * Generate a pretty-printed JSON string from the audit report.
 */
export function generateJsonReport(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

// -----------------------------------------------
// Markdown report
// -----------------------------------------------

/**
 * Generate a full Markdown report from the audit results.
 */
export function generateMarkdownReport(report: AuditReport): string {
  const lines: string[] = [];

  // Title and date
  lines.push("# AFRIK Data Pipeline Audit Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt.split("T")[0]}`);
  lines.push("");

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| Type | Total | Full | Partial | Empty | Parse Failures |");
  lines.push("|------|-------|------|---------|-------|----------------|");

  const typeOrder: EntityType[] = ["country", "people", "languageFamily"];
  let totalAll = 0;
  let fullAll = 0;
  let partialAll = 0;
  let emptyAll = 0;
  let parseFailuresAll = 0;

  for (const entityType of typeOrder) {
    const stats = report.summary.byType[entityType];
    const label = ENTITY_TYPE_LABELS[entityType];
    lines.push(
      `| ${label} | ${stats.total} | ${stats.full} | ${stats.partial} | ${stats.empty} | ${stats.parseFailures} |`
    );
    totalAll += stats.total;
    fullAll += stats.full;
    partialAll += stats.partial;
    emptyAll += stats.empty;
    parseFailuresAll += stats.parseFailures;
  }

  lines.push(
    `| **Total** | **${totalAll}** | **${fullAll}** | **${partialAll}** | **${emptyAll}** | **${parseFailuresAll}** |`
  );
  lines.push("");

  // Cross-layer gaps
  lines.push("## Cross-Layer Gaps");
  lines.push("");

  if (report.crossLayerGaps.length === 0) {
    lines.push("No cross-layer gaps detected.");
  } else {
    for (const gap of report.crossLayerGaps) {
      const emoji = SEVERITY_EMOJI[gap.severity] ?? "";
      lines.push(
        `- ${emoji} **[${gap.severity.toUpperCase()}]** \`${gap.layer}\` / \`${gap.field}\` (${ENTITY_TYPE_LABELS[gap.entityType]})`
      );
      lines.push(`  ${gap.description}`);
      lines.push("");
    }
  }
  lines.push("");

  // Failure analysis
  if (report.failureAnalysis && report.failureAnalysis.totalFailures > 0) {
    const fa = report.failureAnalysis;
    lines.push("## Parse Failure Analysis");
    lines.push("");
    lines.push(
      `**${fa.totalFailures} files failed to parse** (Countries: ${fa.byEntityType.country}, Peoples: ${fa.byEntityType.people}, Families: ${fa.byEntityType.languageFamily})`
    );
    lines.push("");

    for (const cause of fa.rootCauses) {
      lines.push(`### Root Cause: ${cause.error} (${cause.count} files)`);
      lines.push("");
      lines.push(`**Description:** ${cause.description}`);
      lines.push("");
      lines.push("**Affected directories:**");
      lines.push("");
      lines.push("| Directory | Count | Text in File | Expected |");
      lines.push("|-----------|-------|-------------|----------|");
      for (const family of cause.affectedFamilies) {
        lines.push(
          `| ${family.directory} | ${family.count} | ${family.textValue} | ${family.expectedValue} |`
        );
      }
      lines.push("");
      lines.push(`**Recommended fix:** ${cause.fix}`);
      lines.push("");
    }
  }

  // Detail sections per entity type
  for (const entityType of typeOrder) {
    const label = ENTITY_TYPE_DETAIL_LABELS[entityType];
    const filesForType = report.files
      .filter((f) => f.entityType === entityType)
      // Sort by completeness ascending (worst first)
      .sort((a, b) => a.completenessPercent - b.completenessPercent);

    lines.push(`## Detail: ${label}`);
    lines.push("");

    if (filesForType.length === 0) {
      lines.push("No files audited.");
      lines.push("");
      continue;
    }

    lines.push("| File | ID | Grade | Completeness | Missing Sections |");
    lines.push("|------|-----|-------|--------------|------------------|");

    for (const file of filesForType) {
      const basename = path.basename(file.filePath);
      const missingSections = Object.entries(file.sections)
        .filter(([, status]) => status === "missing" || status === "empty")
        .map(([name]) => name)
        .join(", ");

      lines.push(
        `| ${basename} | ${file.entityId} | ${file.grade} | ${file.completenessPercent}% | ${missingSections || "none"} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// -----------------------------------------------
// Write reports to disk
// -----------------------------------------------

/**
 * Write JSON and Markdown reports to the specified output directory.
 * Creates the directory if it does not exist.
 */
export async function writeReports(
  report: AuditReport,
  outputDir: string
): Promise<void> {
  const resolvedDir = path.resolve(outputDir);

  // Create output directory if needed
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  // Write JSON report
  const jsonPath = path.join(resolvedDir, "audit-report.json");
  fs.writeFileSync(jsonPath, generateJsonReport(report), "utf-8");

  // Write Markdown report
  const mdPath = path.join(resolvedDir, "AUDIT-SUMMARY.md");
  fs.writeFileSync(mdPath, generateMarkdownReport(report), "utf-8");
}

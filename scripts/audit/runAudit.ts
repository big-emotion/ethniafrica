#!/usr/bin/env tsx
/**
 * AFRIK Data Pipeline Audit — CLI Entry Point
 *
 * Run with: tsx scripts/audit/runAudit.ts
 *
 * Performs a full audit of AFRIK source files and cross-layer gap analysis,
 * then writes JSON and Markdown reports to dataset/source/afrik/logs/.
 */

import { runFullAudit } from "./auditRunner";
import { analyzeAllGaps } from "./gapAnalyzer";
import { generateMarkdownReport, writeReports } from "./reportGenerator";
import type { AuditReport } from "./types";

async function main() {
  console.log("\uD83D\uDD0D Starting AFRIK data pipeline audit...\n");

  // 1. Run file audit
  console.log("\uD83D\uDCC2 Auditing source files...");
  const { files, summary, failureAnalysis } = await runFullAudit();
  console.log(`   Found ${summary.totalFiles} files.\n`);

  // 2. Run gap analysis
  console.log("\uD83D\uDD17 Analyzing cross-layer gaps...");
  const crossLayerGaps = await analyzeAllGaps();
  console.log(`   Found ${crossLayerGaps.length} gaps.\n`);

  // 3. Build report
  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    summary,
    files,
    crossLayerGaps,
    failureAnalysis,
  };

  // 4. Write reports
  const outputDir = "dataset/source/afrik/logs";
  await writeReports(report, outputDir);

  // 5. Print summary to console
  console.log("\n" + generateMarkdownReport(report));
  console.log(`\n\u2705 Reports written to ${outputDir}/`);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});

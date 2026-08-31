#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { logger } from "@/lib/api/logger";

export interface LegacyCitationAuditResult {
  sourceKey: string;
  legacyRawCitation: string;
  sourceKind: "unknown";
  /** A citation nobody has classified yet is unverified, not untiered. */
  tier: "unverified";
  identifiers: Record<string, never>;
  reviewStatus: "review_required";
}

export function sourceKeyForLegacyCitation(rawCitation: string): string {
  const digest = createHash("sha256").update(rawCitation, "utf8").digest("hex");
  return `legacy-${digest}`;
}

export function auditLegacyCitations(
  citations: readonly string[]
): LegacyCitationAuditResult[] {
  return citations.map((rawCitation) => ({
    sourceKey: sourceKeyForLegacyCitation(rawCitation),
    legacyRawCitation: rawCitation,
    sourceKind: "unknown",
    tier: "unverified",
    identifiers: {},
    reviewStatus: "review_required",
  }));
}

function main(): void {
  const results = auditLegacyCitations(process.argv.slice(2));
  logger.info("Legacy citation audit completed", {
    citationCount: results.length,
    results,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}

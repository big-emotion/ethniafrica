import { z } from "zod";
import catalog from "../../../config/sources/authorized-source-catalog.json";
import {
  SOURCE_KINDS,
  SOURCE_TIERS,
  type SourceKind,
  type SourceTier,
} from "@/types/sources";

// @req REQ-092
export const sourceTierSchema = z.enum(SOURCE_TIERS);

// @req REQ-092
export const sourceKindSchema = z.enum(SOURCE_KINDS);

/**
 * Source kinds that carry no authority of their own: a lookup surface
 * (Wikipedia, WorldCat, Sudoc) or machine-written text. They are cited, and
 * they are cited as `unverified`.
 */
const KINDS_WITHOUT_AUTHORITY = ["discovery", "ai_generated"] as const;

// @req REQ-092
export const authorizedSourceEntrySchema = z.object({
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  tier: sourceTierSchema,
  sourceKind: sourceKindSchema.exclude(["unknown"]),
  matchDomains: z.array(z.string().min(1)).min(1),
});

// @req REQ-092
export const authorizedSourceCatalogSchema = z.object({
  version: z.number().int().positive(),
  entries: z.array(authorizedSourceEntrySchema),
});

export type AuthorizedSourceCatalog = z.infer<
  typeof authorizedSourceCatalogSchema
>;
export type AuthorizedSourceEntry = z.infer<typeof authorizedSourceEntrySchema>;
export type { SourceKind };

export interface SourcePolicyOutcome {
  key: string;
  tier: SourceTier;
  sourceKind: SourceKind;
}

// @req REQ-092
export const authorizedSourceCatalog =
  authorizedSourceCatalogSchema.parse(catalog);

// @req REQ-092
export function validateAuthorizedSourceCatalog(
  value: AuthorizedSourceCatalog
): string[] {
  const issues: string[] = [];
  const keys = new Set<string>();

  for (const entry of value.entries) {
    if (keys.has(entry.key)) issues.push(`Duplicate source key: ${entry.key}`);
    keys.add(entry.key);

    const carriesNoAuthority = (
      KINDS_WITHOUT_AUTHORITY as readonly string[]
    ).includes(entry.sourceKind);
    if (carriesNoAuthority && entry.tier !== "unverified") {
      issues.push(
        `${entry.key}: a ${entry.sourceKind} source cannot be tiered "${entry.tier}"`
      );
    }
  }

  return issues;
}

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Tiers a citation by its domain. An unparseable or off-catalogue URL is
 * `unverified` rather than rejected: under the source doctrine nothing is
 * forbidden, the tier carries the signal.
 */
// @req REQ-092
export function evaluateSourceUrl(url: string): SourcePolicyOutcome {
  const offCatalogue: SourcePolicyOutcome = {
    key: "unknown",
    tier: "unverified",
    sourceKind: "unknown",
  };

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return offCatalogue;
  }

  const entry = authorizedSourceCatalog.entries.find((candidate) =>
    candidate.matchDomains.some((domain) => matchesDomain(hostname, domain))
  );

  if (!entry) return offCatalogue;

  return {
    key: entry.key,
    tier: entry.tier,
    sourceKind: entry.sourceKind,
  };
}

import { z } from "zod";
import catalog from "../../../config/sources/authorized-source-catalog.json";

// @req REQ-092
export const sourceAdmissionSchema = z.enum([
  "preferred",
  "allowed",
  "discovery_only",
  "review_required",
  "prohibited",
]);

// @req REQ-092
export const sourceKindSchema = z.enum([
  "intergovernmental",
  "government",
  "official_statistics",
  "linguistic_reference",
  "academic",
  "community",
  "repository",
  "archive",
  "discovery",
  "ai_generated",
  "unknown",
]);

// @req REQ-092
export const authorizedSourceEntrySchema = z.object({
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  admission: sourceAdmissionSchema.exclude(["review_required"]),
  evidenceTier: z.union([z.literal(1), z.literal(2), z.null()]),
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
export type SourceAdmission = z.infer<typeof sourceAdmissionSchema>;
export type SourceKind = z.infer<typeof sourceKindSchema>;

export interface SourcePolicyOutcome {
  key: string;
  admission: SourceAdmission;
  evidenceTier: 1 | 2 | null;
  sourceKind: SourceKind;
  publishable: boolean;
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

    const publishable =
      entry.admission === "preferred" || entry.admission === "allowed";
    if (
      publishable !== (entry.evidenceTier === 1 || entry.evidenceTier === 2)
    ) {
      issues.push(`Invalid evidence tier for ${entry.key}`);
    }
  }

  return issues;
}

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

// @req REQ-092
export function evaluateSourceUrl(url: string): SourcePolicyOutcome {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return {
      key: "unknown",
      admission: "review_required",
      evidenceTier: null,
      sourceKind: "unknown",
      publishable: false,
    };
  }

  const entry = authorizedSourceCatalog.entries.find((candidate) =>
    candidate.matchDomains.some((domain) => matchesDomain(hostname, domain))
  );

  if (!entry) {
    return {
      key: "unknown",
      admission: "review_required",
      evidenceTier: null,
      sourceKind: "unknown",
      publishable: false,
    };
  }

  return {
    key: entry.key,
    admission: entry.admission,
    evidenceTier: entry.evidenceTier,
    sourceKind: entry.sourceKind,
    publishable:
      entry.admission === "preferred" || entry.admission === "allowed",
  };
}

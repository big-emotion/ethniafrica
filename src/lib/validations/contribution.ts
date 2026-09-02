import { z } from "zod";
import {
  evaluateSourceUrl,
  type SourceKind,
} from "@/lib/sources/authorized-source-catalog";
import type { SourceTier } from "@/types/sources";

// @req REQ-092
export const contributionTypeSchema = z.enum([
  "new_people",
  "update_people",
  "new_country",
  "update_country",
  "new_language_family",
  "update_language_family",
]);

export interface ContributionSourceCitation {
  url: string;
  path: (string | number)[];
  tier: SourceTier;
  sourceKind: SourceKind;
}

function sourceUrlsFromValue(value: unknown): string[] {
  if (typeof value === "string") {
    return Array.from(
      value.matchAll(/https?:\/\/[^\s]+/g),
      (match) => match[0]
    );
  }

  if (
    value &&
    typeof value === "object" &&
    "url" in value &&
    typeof value.url === "string"
  ) {
    return [value.url];
  }

  return [];
}

/**
 * Tiers every source URL a submitted contribution cites.
 *
 * No citation is refused: the tier is the signal, and an off-catalogue or
 * discovery-only domain simply comes back `unverified`. Callers use this to
 * tell the contributor how their evidence will be labelled, not to gate them.
 */
// @req REQ-092
export function getContributionSourceCitations(
  payload: Record<string, unknown>
): ContributionSourceCitation[] {
  const citations: ContributionSourceCitation[] = [];

  const visit = (value: unknown, path: (string | number)[]) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index]));
      return;
    }

    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
      const childPath = [...path, key];

      if (key === "sources" && Array.isArray(child)) {
        child.forEach((source, index) => {
          const sourcePath = [...childPath, index];
          const urls = sourceUrlsFromValue(source);

          urls.forEach((url) => {
            const outcome = evaluateSourceUrl(url);
            citations.push({
              url,
              path:
                typeof source === "object" && source !== null && "url" in source
                  ? [...sourcePath, "url"]
                  : sourcePath,
              tier: outcome.tier,
              sourceKind: outcome.sourceKind,
            });
          });

          visit(source, sourcePath);
        });
        continue;
      }

      visit(child, childPath);
    }
  };

  visit(payload, []);
  return citations;
}

// @req REQ-092
export const contributionSchema = z.object({
  type: contributionTypeSchema,
  proposed_payload: z.record(z.string(), z.unknown()),
  contributor_email: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.email().optional()
  ),
  contributor_name: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.string().min(1).max(200).optional()
  ),
  notes: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.string().max(2000).optional()
  ),
  honeypot: z.string().optional(),
});

export type ContributionInput = z.infer<typeof contributionSchema>;

import { z } from "zod";
import {
  evaluateSourceUrl,
  type SourceAdmission,
  type SourceKind,
} from "@/lib/sources/authorized-source-catalog";

// @req REQ-092
export const contributionTypeSchema = z.enum([
  "new_people",
  "update_people",
  "new_country",
  "update_country",
  "new_language_family",
  "update_language_family",
]);

export interface ContributionSourcePolicyIssue {
  url: string;
  path: (string | number)[];
  admission: SourceAdmission;
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

// @req REQ-092
export function getContributionSourcePolicyIssues(
  payload: Record<string, unknown>
): ContributionSourcePolicyIssue[] {
  const issues: ContributionSourcePolicyIssue[] = [];

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
            if (!outcome.publishable) {
              issues.push({
                url,
                path:
                  typeof source === "object" &&
                  source !== null &&
                  "url" in source
                    ? [...sourcePath, "url"]
                    : sourcePath,
                admission: outcome.admission,
                sourceKind: outcome.sourceKind,
              });
            }
          });

          visit(source, sourcePath);
        });
        continue;
      }

      visit(child, childPath);
    }
  };

  visit(payload, []);
  return issues;
}

// @req REQ-092
export const contributionSchema = z
  .object({
    type: contributionTypeSchema,
    proposed_payload: z.record(z.unknown()),
    contributor_email: z.preprocess(
      (val) => (val === null || val === "" ? undefined : val),
      z.string().email().optional()
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
  })
  .superRefine((contribution, ctx) => {
    for (const issue of getContributionSourcePolicyIssues(
      contribution.proposed_payload
    )) {
      if (
        issue.admission === "discovery_only" ||
        issue.admission === "prohibited"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["proposed_payload", ...issue.path],
          message:
            issue.admission === "discovery_only"
              ? "discovery-only citations cannot be submitted as evidence"
              : "prohibited citations cannot be submitted as evidence",
        });
      }
    }
  });

export type ContributionInput = z.infer<typeof contributionSchema>;

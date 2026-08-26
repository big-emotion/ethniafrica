import { z } from "zod";
import type {
  AssertionSourceReference,
  LegacySourceCandidate,
  StructuredSourceRecord,
} from "@/types/sources";
import {
  sourceKindSchema,
  sourceTierSchema,
} from "@/lib/sources/authorized-source-catalog";

const stableSourceKeySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: "sourceKey must be a stable kebab-case key",
});

const httpUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    },
    { message: "url must use HTTP or HTTPS" }
  );

export const structuredSourceKindSchema = sourceKindSchema.exclude([
  "discovery",
  "ai_generated",
  "unknown",
]);

export const sourceRecordSchema = z
  .object({
    sourceKey: stableSourceKeySchema,
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    publicationYear: z.number().int(),
    sourceKind: structuredSourceKindSchema,
    tier: sourceTierSchema,
    identifiers: z.record(z.string().min(1)),
    publisher: z.string().min(1).nullable(),
    url: httpUrlSchema.nullable(),
  })
  .strict();

export const assertionLocatorTypeSchema = z.enum([
  "page",
  "folio",
  "section",
  "timestamp",
]);

export const assertionSourceReferenceSchema = z
  .object({
    sourceKey: stableSourceKeySchema,
    locatorType: assertionLocatorTypeSchema,
    locatorValue: z.string().min(1),
  })
  .strict();

export interface LegacySourceAdapterError {
  path: string;
  message: string;
}

export type LegacySourceAdapterResult =
  | { success: true; data: LegacySourceCandidate[] }
  | { success: false; errors: LegacySourceAdapterError[] };

export function adaptLegacySources(raw: unknown): LegacySourceAdapterResult {
  if (!Array.isArray(raw)) {
    return {
      success: false,
      errors: [{ path: "sources", message: "legacy sources must be an array" }],
    };
  }

  const errors: LegacySourceAdapterError[] = [];
  const data: LegacySourceCandidate[] = [];

  raw.forEach((citation, index) => {
    if (typeof citation !== "string") {
      errors.push({
        path: `sources.${index}`,
        message: "legacy sources must be strings",
      });
      return;
    }

    data.push({
      legacyRawCitation: citation,
      reviewStatus: "review_required",
    });
  });

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, data };
}

export function toStructuredSourceRecord(
  value: z.infer<typeof sourceRecordSchema>
): StructuredSourceRecord {
  return {
    sourceKey: value.sourceKey,
    title: value.title,
    authors: value.authors,
    publicationYear: value.publicationYear,
    sourceKind: value.sourceKind,
    tier: value.tier,
    identifiers: value.identifiers,
    publisher: value.publisher,
    url: value.url,
  };
}

export function toAssertionSourceReference(
  value: z.infer<typeof assertionSourceReferenceSchema>
): AssertionSourceReference {
  return {
    sourceKey: value.sourceKey,
    locatorType: value.locatorType,
    locatorValue: value.locatorValue,
  };
}

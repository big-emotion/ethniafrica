/**
 * Zod schemas for /v2/confidence/{entityType}/{entityId}.
 *
 * NOTE: Column layout reflects the target schema introduced by ETNI-22
 * (migration 014). The pre-014 `confidence_scores` table only carries
 * `score` + `methodology`; the service layer falls back to safe defaults
 * (`null`/0) for the additional columns until 014 has been applied.
 */

import { z } from "zod";

/**
 * Public entity-type values accepted by /v2/confidence/{entityType}/{entityId}.
 * Hyphenated for URL friendliness; mapped to internal underscore keys
 * (`language_family`) inside the service.
 */
export const confidenceEntityTypeSchema = z.enum(["people", "language-family"]);

export type ConfidenceEntityType = z.infer<typeof confidenceEntityTypeSchema>;

export const confidenceEntityIdSchema = z
  .string()
  .min(1)
  .regex(/^(PPL_[A-Z0-9_]+|FLG_[A-Z0-9_]+)$/, {
    message: "Invalid entity id format (expected PPL_* or FLG_*)",
  });

export const confidenceParamsSchema = z.object({
  entityType: confidenceEntityTypeSchema,
  entityId: confidenceEntityIdSchema,
});

export type ConfidenceParams = z.infer<typeof confidenceParamsSchema>;

export const confidenceRecordSchema = z.object({
  entityType: confidenceEntityTypeSchema,
  entityId: z.string(),
  score: z.number().min(0).max(100).nullable(),
  sourceCount: z.number().int().min(0),
  avgSourceQuality: z.number().min(0).max(1).nullable(),
  lastHumanAuditAt: z.string().nullable(),
  openFlagCount: z.number().int().min(0),
  recomputedAt: z.string().nullable(),
});

export type ConfidenceRecord = z.infer<typeof confidenceRecordSchema>;

/**
 * Zod schemas for /v2/sources endpoints (Module #0).
 *
 * NOTE: Column layout reflects the target schema introduced by ETNI-22
 * (migration 014). Until 014 has been applied, the `pinned_url`, `year`,
 * `author`, `publisher`, `resolvable`, and `last_verified_at` columns may
 * be absent and will be returned as `null` by the service layer.
 */

import { z } from "zod";
import {
  sourceAdmissionSchema,
  sourceKindSchema,
} from "@/lib/sources/authorized-source-catalog";

// @req REQ-092
export const sourceTypeSchema = z.enum([
  "primary",
  "secondary",
  "tertiary",
  "ai",
]);

// @req REQ-092
export const sourcePolicySchema = z.object({
  key: z.string(),
  admission: sourceAdmissionSchema,
  evidenceTier: z.union([z.literal(1), z.literal(2), z.null()]),
  sourceKind: sourceKindSchema,
  publishable: z.boolean(),
});

// @req REQ-092
export const sourceSchema = z.object({
  id: z.string().uuid(),
  sourceKey: z.string().nullable(),
  sourceKind: sourceKindSchema.nullable(),
  evidenceTier: z.union([z.literal(1), z.literal(2)]).nullable(),
  identifiers: z.record(z.string(), z.string()).nullable(),
  type: sourceTypeSchema.nullable(),
  title: z.string(),
  url: z.string().nullable(),
  pinnedUrl: z.string().nullable(),
  year: z.number().int().nullable(),
  author: z.string().nullable(),
  publisher: z.string().nullable(),
  resolvable: z.boolean().nullable(),
  lastVerifiedAt: z.string().nullable(),
  policy: sourcePolicySchema,
});

export type Source = z.infer<typeof sourceSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;

/**
 * GET /v2/sources query parameters
 */
// @req REQ-092
export const listSourcesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListSourcesQuery = z.infer<typeof listSourcesQuerySchema>;

/**
 * GET /v2/sources/{id} path parameters
 */
// @req REQ-092
export const sourceIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid source id format (uuid expected)" }),
});

export type SourceIdParam = z.infer<typeof sourceIdParamSchema>;

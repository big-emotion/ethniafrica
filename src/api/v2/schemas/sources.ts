/**
 * Zod schemas for /v2/sources endpoints (Module #0).
 *
 * NOTE: Column layout reflects the target schema introduced by ETNI-22
 * (migration 014). Until 014 has been applied, the `pinned_url`, `year`,
 * `author`, `publisher`, `resolvable`, and `last_verified_at` columns may
 * be absent and will be returned as `null` by the service layer.
 */

import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "primary",
  "secondary",
  "tertiary",
  "ai",
]);

export const sourceSchema = z.object({
  id: z.string().uuid(),
  type: sourceTypeSchema.nullable(),
  title: z.string(),
  url: z.string().nullable(),
  pinnedUrl: z.string().nullable(),
  year: z.number().int().nullable(),
  author: z.string().nullable(),
  publisher: z.string().nullable(),
  resolvable: z.boolean().nullable(),
  lastVerifiedAt: z.string().nullable(),
});

export type Source = z.infer<typeof sourceSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;

/**
 * GET /v2/sources query parameters
 */
export const listSourcesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListSourcesQuery = z.infer<typeof listSourcesQuerySchema>;

/**
 * GET /v2/sources/{id} path parameters
 */
export const sourceIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid source id format (uuid expected)" }),
});

export type SourceIdParam = z.infer<typeof sourceIdParamSchema>;

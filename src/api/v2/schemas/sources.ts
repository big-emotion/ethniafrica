/**
 * Zod schemas for /v2/sources endpoints (Module #0).
 *
 * The column layout is the one migrations 015, 031, 041 and 078 actually
 * built. An earlier note here credited "migration 014 (ETNI-22)" with
 * introducing half of these columns; 014 is the flag-severity migration and
 * never touched `sources`, and chasing that claim is a wasted afternoon.
 *
 * Two fields have no column behind them and answer `null` for every row:
 * `pinnedUrl` (an archived copy of a rotted link) and `resolvable` (the
 * outcome of the nightly link check, which today writes only a log file).
 * They are kept, marked deprecated in the OpenAPI document, because removing
 * a published property is a breaking change that `openapi:diff` gates — and
 * one that would buy a consumer nothing, since `null` before and absent after
 * read the same. They go when something fills them, or in a deliberate
 * breaking release.
 */

import { z } from "zod";
import {
  sourceKindSchema,
  sourceTierSchema,
} from "@/lib/sources/authorized-source-catalog";

/**
 * The tier the catalogue assigns to a citation's domain, alongside the kind of
 * thing that domain publishes. Authority and provenance stay separate fields.
 */
// @req REQ-092
export const sourcePolicySchema = z.object({
  key: z.string(),
  tier: sourceTierSchema,
  sourceKind: sourceKindSchema,
});

// @req REQ-092
export const sourceSchema = z.object({
  id: z.string().uuid(),
  sourceKey: z.string().nullable(),
  sourceKind: sourceKindSchema.nullable(),
  tier: sourceTierSchema.nullable(),
  identifiers: z.record(z.string(), z.string()).nullable(),
  title: z.string(),
  url: z.string().nullable(),
  pinnedUrl: z.string().nullable(),
  year: z.number().int().nullable(),
  author: z.string().nullable(),
  publisher: z.string().nullable(),
  resolvable: z.boolean().nullable(),
  lastVerifiedAt: z.string().nullable(),
  /** Why this source carries the tier it carries. Set on every row. */
  notes: z.string().nullable(),
  /** The locator inside the work, when the citation named one. */
  page: z.string().nullable(),
  addedAt: z.string().nullable(),
  policy: sourcePolicySchema,
});

export type Source = z.infer<typeof sourceSchema>;

/**
 * GET /v2/sources query parameters
 */
/**
 * Every field but the two page ones is `.optional()` with no default, so an
 * unnarrowed request produces exactly the object it always did — the endpoint's
 * existing callers keep the payload they were written against.
 *
 * `tier` accepts the literal `needs_review` alongside the three real tiers. It
 * is not a fourth: it selects the rows that carry none, which the corpus
 * distinguishes from `unverified` because "not yet classified" is not a
 * judgement anyone made.
 */
// @req REQ-092
export const listSourcesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).optional(),
  tier: z.union([sourceTierSchema, z.literal("needs_review")]).optional(),
  sourceKind: sourceKindSchema.optional(),
  decade: z.coerce.number().int().min(1000).max(2999).optional(),
  sort: z.enum(["title", "year", "added"]).optional(),
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

/**
 * Zod schemas for /v2/doctrine.
 *
 * The `editorial_doctrine` table is created by migration 008. The target
 * schema introduced by ETNI-22 (migration 014) renames `content` to
 * `mdx_source` and adds `slug` / `published_at`; the service layer reads
 * whichever column set is present.
 */

import { z } from "zod";

/**
 * Canonical doctrine slugs surfaced by /v2/doctrine. The endpoint always
 * returns the current version of every slug.
 */
export const doctrineSlugSchema = z.enum([
  "review_policy",
  "naming_convention",
  "ai_disclosure",
  "license_attribution",
]);

export type DoctrineSlug = z.infer<typeof doctrineSlugSchema>;

export const doctrineEntrySchema = z.object({
  slug: doctrineSlugSchema,
  title: z.string(),
  mdxSource: z.string(),
  version: z.number().int().min(1),
  publishedAt: z.string().nullable(),
});

export type DoctrineEntry = z.infer<typeof doctrineEntrySchema>;

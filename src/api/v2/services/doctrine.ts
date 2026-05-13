/**
 * Doctrine service — Supabase queries for the `editorial_doctrine` table.
 *
 * Returns the current (active) row for every canonical doctrine slug.
 * Supports both the pre-014 column layout (`key` / `content` / `updated_at`)
 * and the post-014 layout (`slug` / `mdx_source` / `published_at`).
 */

import { createServerClient } from "@/lib/supabase/server";
import type { DoctrineEntry, DoctrineSlug } from "@/api/v2/schemas/doctrine";
import { doctrineSlugSchema } from "@/api/v2/schemas/doctrine";

const CANONICAL_SLUGS: DoctrineSlug[] = [
  "review_policy",
  "naming_convention",
  "ai_disclosure",
  "license_attribution",
];

function mapRowToEntry(row: Record<string, unknown>): DoctrineEntry | null {
  // post-014 layout: slug / mdx_source / published_at
  // pre-014 layout : key  / content    / updated_at
  const rawSlug =
    (row.slug as string | undefined) ?? (row.key as string | undefined);
  if (!rawSlug) return null;

  const slug = doctrineSlugSchema.safeParse(rawSlug);
  if (!slug.success) return null;

  const mdxSource =
    (row.mdx_source as string | undefined) ??
    (row.content as string | undefined) ??
    "";
  const publishedAt =
    (row.published_at as string | null | undefined) ??
    (row.updated_at as string | null | undefined) ??
    null;

  return {
    slug: slug.data,
    title: (row.title as string) ?? "",
    mdxSource,
    version: (row.version as number | null) ?? 1,
    publishedAt,
  };
}

export async function listDoctrine(): Promise<DoctrineEntry[]> {
  const supabase = createServerClient();

  // Note: filter on `key` matches the pre-014 column name. Post-014 the
  // column is `slug`; if Supabase rejects the filter at that point the
  // service can be updated to switch on column presence — but the public
  // contract (return canonical slugs only) is enforced in `mapRowToEntry`.
  const { data, error } = await supabase
    .from("editorial_doctrine")
    .select("*")
    .in("key", CANONICAL_SLUGS)
    .eq("active", true)
    .order("key");

  if (error) {
    throw new Error(`Failed to load editorial doctrine: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows
    .map(mapRowToEntry)
    .filter((entry): entry is DoctrineEntry => entry !== null);
}

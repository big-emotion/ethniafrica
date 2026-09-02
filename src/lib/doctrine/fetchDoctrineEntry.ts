/**
 * Fetches a live or exact-version editorial-doctrine entry from Supabase.
 *
 * Story ETNI-30.
 *
 * Schema reminder (after migration 014 reconciliation):
 *   editorial_doctrine (
 *     id           UUID PRIMARY KEY,
 *     slug         TEXT NOT NULL,
 *     title        TEXT NOT NULL,
 *     mdx_source   TEXT NOT NULL,
 *     version      INTEGER NOT NULL,
 *     published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     superseded_at TIMESTAMPTZ,
 *     UNIQUE (slug, version)
 *   );
 */
import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";

export interface DoctrineEntry {
  id: string;
  slug: string;
  title: string;
  mdxSource: string;
  version: number;
  publishedAt: string;
}

/**
 * Without a version, returns the highest current non-superseded entry.
 * With a version, returns the exact historical entry, including superseded rows.
 */
// @req REQ-025
export async function fetchDoctrineEntry(
  slug: string,
  version?: number
): Promise<DoctrineEntry | null> {
  const supabase = createServerClient();

  const query = supabase
    .from("editorial_doctrine")
    .select("id, slug, title, mdx_source, version, published_at")
    .eq("slug", slug);

  const { data, error } =
    version === undefined
      ? await query
          .is("superseded_at", null)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle()
      : await query.eq("version", version).maybeSingle();

  // A failed read is not an absent doctrine. The caller answers `null` with
  // `notFound()`, so folding the two together published a 404 for a page whose
  // row was sitting in the table the whole time — a withdrawal notice to every
  // crawler that happened to arrive during the outage. `maybeSingle()` reports
  // "no such row" as `data: null` with no error, which is the only shape that
  // may become a 404.
  if (error) {
    logger.error(`Failed to read doctrine entry ${slug}`, error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    mdxSource: data.mdx_source,
    version: data.version,
    publishedAt: data.published_at,
  };
}

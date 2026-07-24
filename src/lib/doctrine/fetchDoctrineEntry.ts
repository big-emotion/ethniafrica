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

  if (error || !data) {
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

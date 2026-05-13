/**
 * Fetches the current (highest version, non-superseded) editorial-doctrine
 * entry for a given slug from Supabase.
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
 * Returns the current version of a doctrine entry by slug, or null if
 * no published (non-superseded) version exists.
 */
export async function fetchDoctrineEntry(
  slug: string
): Promise<DoctrineEntry | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("editorial_doctrine")
    .select("id, slug, title, mdx_source, version, published_at")
    .eq("slug", slug)
    .is("superseded_at", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

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

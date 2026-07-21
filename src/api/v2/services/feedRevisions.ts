import { createServerClient } from "@/lib/supabase/server";

export interface FeedRevisionItem {
  entity_type: string;
  entity_id: string;
  slug: string;
  version: number;
  published_at: string | null;
  pinned_url: string;
  summary: string | null;
}

export interface FeedRevisionsResult {
  items: FeedRevisionItem[];
  next_cursor: string | null;
}

export function encodeCursor(publishedAt: string, id: string): string {
  return Buffer.from(`${publishedAt}|${id}`).toString("base64url");
}

export function decodeCursor(
  cursor: string
): { publishedAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const pipeIdx = decoded.indexOf("|");
    if (pipeIdx < 0) return null;
    const publishedAt = decoded.slice(0, pipeIdx);
    const id = decoded.slice(pipeIdx + 1);
    if (!publishedAt || !id) return null;
    return { publishedAt, id };
  } catch {
    return null;
  }
}

function derivePinnedUrl(
  entityType: string,
  entityId: string,
  version: number
): string {
  if (entityType === "people")
    return `/api/v2/peoples/${entityId}/versions/${version}`;
  if (entityType === "country")
    return `/api/v2/countries/${entityId}/versions/${version}`;
  if (entityType === "languageFamily")
    return `/api/v2/language-families/${entityId}/versions/${version}`;
  return `/api/v2/${entityType}/${entityId}/versions/${version}`;
}

function deriveSlug(entityId: string): string {
  return entityId.toLowerCase();
}

export async function listFeedRevisions(
  limit: number,
  since?: string,
  cursor?: string
): Promise<FeedRevisionsResult> {
  const supabase = createServerClient();

  let query = supabase
    .from("revisions")
    .select("id, entity_type, entity_id, version, published_at, reason")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (since) {
    query = query.gte("published_at", since);
  }

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query = query.or(
        `published_at.lt.${decoded.publishedAt},and(published_at.eq.${decoded.publishedAt},id.lt.${decoded.id})`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list feed revisions: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    entity_type: string;
    entity_id: string;
    version: number;
    published_at: string | null;
    reason: string | null;
  }>;

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items: FeedRevisionItem[] = pageRows.map((row) => ({
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    slug: deriveSlug(row.entity_id),
    version: row.version,
    published_at: row.published_at,
    pinned_url: derivePinnedUrl(row.entity_type, row.entity_id, row.version),
    summary: row.reason,
  }));

  let next_cursor: string | null = null;
  if (hasMore) {
    const lastRow = pageRows[pageRows.length - 1];
    if (lastRow.published_at) {
      next_cursor = encodeCursor(lastRow.published_at, lastRow.id);
    }
  }

  return { items, next_cursor };
}

import { createServerClient } from "@/lib/supabase/server";
import type { Revision, InsertRevisionInput } from "@/api/v2/schemas/revisions";
import { serializePublicContent } from "@/api/v2/serializers/public-content";

export async function insertRevision(
  input: InsertRevisionInput
): Promise<Revision> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("revisions")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert revision: ${error.message}`);
  }
  return data as Revision;
}

export async function getRevision(id: string): Promise<Revision | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("revisions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load revision ${id}: ${error.message}`);
  }
  if (!data) return null;
  return data as Revision;
}

export interface PeopleRevisionListItem {
  version: number;
  published_at: string | null;
  moderator_pseudonym: string | null;
  reason: string | null;
  pinned_url: string;
}

export interface ListPeopleRevisionsResult {
  items: PeopleRevisionListItem[];
  next_cursor: number | null;
}

export type RevisionEntityType = "language_family" | "people" | "country";

export interface FrozenDoctrineReference {
  slug: string;
  version: number;
}

export interface RevisionSnapshot {
  data: Record<string, unknown>;
  version: number;
  published_at: string | null;
  confidence: number | null;
  doctrine: FrozenDoctrineReference | null;
}

export interface PeopleRevisionSnapshot {
  data: Record<string, unknown>;
  version: number;
  published_at: string | null;
  confidence: number | null;
  doctrine?: FrozenDoctrineReference | null;
}

function derivePseudonym(
  moderatorId: string | null | undefined
): string | null {
  if (!moderatorId) return null;
  return `mod-${moderatorId.replace(/-/g, "").slice(0, 8)}`;
}

export async function listPeopleRevisions(
  entityId: string,
  limit: number,
  cursor?: number
): Promise<ListPeopleRevisionsResult> {
  const supabase = createServerClient();
  let query = supabase
    .from("revisions")
    .select("version, published_at, moderator_id, reason")
    .eq("entity_type", "people")
    .eq("entity_id", entityId)
    .order("version", { ascending: false })
    .limit(limit + 1);

  if (cursor !== undefined) {
    query = query.lt("version", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Failed to list revisions for ${entityId}: ${error.message}`
    );
  }

  const rows = (data ?? []) as Array<{
    version: number;
    published_at: string | null;
    moderator_id: string | null;
    reason: string | null;
  }>;

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items: PeopleRevisionListItem[] = pageRows.map((row) => ({
    version: row.version,
    published_at: row.published_at,
    moderator_pseudonym: derivePseudonym(row.moderator_id),
    reason: row.reason,
    pinned_url: `/api/v2/peoples/${entityId}/versions/${row.version}`,
  }));

  const next_cursor = hasMore ? pageRows[pageRows.length - 1].version : null;

  return { items, next_cursor };
}

export async function getLatestEntityRevisionVersion(
  entityType: string,
  entityId: string
): Promise<number | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("revisions")
    .select("version")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to get latest version for ${entityType}/${entityId}: ${error.message}`
    );
  }

  if (!data) return null;
  return (data as { version: number }).version;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getRevisionSnapshot(
  entityType: RevisionEntityType,
  entityId: string,
  version: number
): Promise<RevisionSnapshot | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("revisions")
    .select("version, snapshot_jsonb, published_at, doctrine_version_id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("version", version)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load revision v${version} for ${entityType}/${entityId}: ${error.message}`
    );
  }

  if (!data) return null;

  const rawRow: unknown = data;
  if (
    !isRecord(rawRow) ||
    typeof rawRow.version !== "number" ||
    !isRecord(rawRow.snapshot_jsonb)
  ) {
    throw new Error(
      `Failed to load revision v${version} for ${entityType}/${entityId}: invalid snapshot row`
    );
  }

  const confidence =
    typeof rawRow.snapshot_jsonb.confidence === "number"
      ? rawRow.snapshot_jsonb.confidence
      : null;
  const doctrineVersionId =
    typeof rawRow.doctrine_version_id === "string"
      ? rawRow.doctrine_version_id
      : null;
  let doctrine: FrozenDoctrineReference | null = null;

  if (doctrineVersionId) {
    const { data: doctrineData, error: doctrineError } = await supabase
      .from("editorial_doctrine")
      .select("slug, version")
      .eq("id", doctrineVersionId)
      .maybeSingle();

    if (doctrineError) {
      throw new Error(
        `Failed to load doctrine version ${doctrineVersionId}: ${doctrineError.message}`
      );
    }

    const rawDoctrine: unknown = doctrineData;
    if (
      isRecord(rawDoctrine) &&
      typeof rawDoctrine.slug === "string" &&
      typeof rawDoctrine.version === "number"
    ) {
      doctrine = {
        slug: rawDoctrine.slug,
        version: rawDoctrine.version,
      };
    }
  }

  return {
    data: serializePublicContent(rawRow.snapshot_jsonb),
    version: rawRow.version,
    published_at:
      typeof rawRow.published_at === "string" ? rawRow.published_at : null,
    confidence,
    doctrine,
  };
}

export async function getPeopleRevisionSnapshot(
  entityId: string,
  version: number
): Promise<PeopleRevisionSnapshot | null> {
  return getRevisionSnapshot("people", entityId, version);
}

import { createServerClient } from "@/lib/supabase/server";

export type MediaEntityType =
  "language_family" | "language" | "people" | "country";

export type MediaDepictionTiming = "contemporary" | "reconstitution";

export interface ListPublicMediaQuery {
  entityType: MediaEntityType;
  entityId: string;
  page: number;
  perPage: number;
}

export interface PublicMedia {
  id: string;
  entityType: MediaEntityType;
  entityId: string;
  author: string | null;
  licenceUri: string;
  sourcePageUrl: string | null;
  period: string | null;
  depictionTiming: MediaDepictionTiming;
}

export interface ListPublicMediaResult {
  data: PublicMedia[];
  total: number;
}

const PUBLIC_MEDIA_SELECT =
  "id,entity_type,entity_id,author,licence_uri,source_page_url,period,depiction_timing";

function getString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function getNullableString(
  row: Record<string, unknown>,
  key: string
): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function mapPublicMedia(row: Record<string, unknown>): PublicMedia {
  return {
    id: getString(row, "id"),
    entityType: getString(row, "entity_type") as MediaEntityType,
    entityId: getString(row, "entity_id"),
    author: getNullableString(row, "author"),
    licenceUri: getString(row, "licence_uri"),
    sourcePageUrl: getNullableString(row, "source_page_url"),
    period: getNullableString(row, "period"),
    depictionTiming: getString(row, "depiction_timing") as MediaDepictionTiming,
  };
}

// @req REQ-128
export async function listPublicMedia(
  query: ListPublicMediaQuery
): Promise<ListPublicMediaResult> {
  const supabase = createServerClient();
  const from = (query.page - 1) * query.perPage;
  const to = from + query.perPage - 1;

  const { data, error, count } = await supabase
    .from("afrik_media")
    .select(PUBLIC_MEDIA_SELECT, { count: "exact" })
    .eq("entity_type", query.entityType)
    .eq("entity_id", query.entityId)
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list public media: ${error.message}`);
  }

  const rows: Array<Record<string, unknown>> = data ?? [];
  return {
    data: rows.map(mapPublicMedia),
    total: count ?? rows.length,
  };
}

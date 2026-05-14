/**
 * Sources service — Supabase queries for the public `sources` table.
 *
 * Reads the column layout introduced by migration 014 (ETNI-22). Columns
 * absent before 014 (`pinned_url`, `year`, `author`, `publisher`,
 * `resolvable`, `last_verified_at`) are normalised to `null` so the public
 * envelope stays type-stable regardless of the migration cursor.
 */

import { createServerClient } from "@/lib/supabase/server";
import type {
  Source,
  SourceType,
  ListSourcesQuery,
} from "@/api/v2/schemas/sources";

const KNOWN_TYPES: SourceType[] = ["primary", "secondary", "tertiary", "ai"];

function mapRowToSource(row: Record<string, unknown>): Source {
  const rawType = row.type as string | null | undefined;
  const type =
    rawType && KNOWN_TYPES.includes(rawType as SourceType)
      ? (rawType as SourceType)
      : null;

  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    url: (row.url as string | null) ?? null,
    type,
    pinnedUrl: (row.pinned_url as string | null) ?? null,
    year: (row.year as number | null) ?? null,
    author: (row.author as string | null) ?? null,
    publisher: (row.publisher as string | null) ?? null,
    resolvable: (row.resolvable as boolean | null) ?? null,
    lastVerifiedAt: (row.last_verified_at as string | null) ?? null,
  };
}

export interface ListSourcesResult {
  data: Source[];
  total: number;
}

export async function listSources(
  query: ListSourcesQuery
): Promise<ListSourcesResult> {
  const supabase = createServerClient();
  const from = (query.page - 1) * query.perPage;
  const to = from + query.perPage - 1;

  const { data, error, count } = await supabase
    .from("sources")
    .select("*", { count: "exact" })
    .order("title")
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list sources: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return {
    data: rows.map(mapRowToSource),
    total: count ?? rows.length,
  };
}

export async function getSourceById(id: string): Promise<Source | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load source ${id}: ${error.message}`);
  }
  if (!data) return null;
  return mapRowToSource(data as Record<string, unknown>);
}

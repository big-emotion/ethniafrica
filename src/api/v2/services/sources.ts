/**
 * Sources service — Supabase queries for the public `sources` table.
 *
 * The columns read here are the ones migrations 015, 031, 041 and 078 built.
 * `pinned_url` and `resolvable` are not among them and never were: the mapper
 * answers `null` for both so the public envelope stays type-stable, and the
 * schema module records why the fields survive their missing columns.
 *
 * The query is `select("*")` rather than a column list, which is what let the
 * payload keep promising four columns that did not exist without the request
 * ever failing. Naming them would have surfaced it years earlier — but it
 * would also break the endpoint outright the moment a column is renamed, so
 * the mapper below stays the single place that knows the layout.
 */

import { createServerClient } from "@/lib/supabase/server";
import {
  evaluateSourceUrl,
  sourceKindSchema,
} from "@/lib/sources/authorized-source-catalog";
import type { Source, ListSourcesQuery } from "@/api/v2/schemas/sources";
import { isSourceTier } from "@/types/sources";

function mapRowToSource(row: Record<string, unknown>): Source {
  const rawSourceKind = row.source_kind as string | null | undefined;
  const rawIdentifiers = row.identifiers;
  const url = typeof row.url === "string" ? row.url : null;
  const sourceKindResult = sourceKindSchema.safeParse(rawSourceKind);
  const sourceKind = sourceKindResult.success ? sourceKindResult.data : null;
  // An untiered legacy row stays null here rather than being coerced: the
  // payload distinguishes "not yet classified" from "classified unverified".
  const tier = isSourceTier(row.tier) ? row.tier : null;
  const identifiers =
    rawIdentifiers &&
    typeof rawIdentifiers === "object" &&
    !Array.isArray(rawIdentifiers)
      ? Object.fromEntries(
          Object.entries(rawIdentifiers).filter(
            ([, value]) => typeof value === "string"
          )
        )
      : null;

  return {
    id: row.id as string,
    sourceKey: (row.source_key as string | null) ?? null,
    sourceKind,
    tier,
    identifiers,
    title: (row.title as string) ?? "",
    url,
    pinnedUrl: (row.pinned_url as string | null) ?? null,
    year: (row.year as number | null) ?? null,
    author: (row.author as string | null) ?? null,
    publisher: (row.publisher as string | null) ?? null,
    resolvable: (row.resolvable as boolean | null) ?? null,
    // `verified_at` is the column; `last_verified_at` never existed, so this
    // field reported null however recently a source had been checked.
    lastVerifiedAt: (row.verified_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    page: (row.page as string | null) ?? null,
    addedAt: (row.added_at as string | null) ?? null,
    policy: evaluateSourceUrl(url ?? ""),
  };
}

export interface ListSourcesResult {
  data: Source[];
  total: number;
}

// @req REQ-092
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

// @req REQ-092
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

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
import { mapRowToSource } from "@/api/v2/services/sourceMapper";
import { narrowSourcesQuery } from "@/api/v2/services/sourcesFacet";
import type { Source, ListSourcesQuery } from "@/api/v2/schemas/sources";

export interface ListSourcesResult {
  data: Source[];
  total: number;
}

const API_SORT_COLUMNS = {
  title: { column: "title", ascending: true },
  year: { column: "year", ascending: false },
  added: { column: "added_at", ascending: false },
} as const;

// @req REQ-092
export async function listSources(
  query: ListSourcesQuery
): Promise<ListSourcesResult> {
  const supabase = createServerClient();
  const from = (query.page - 1) * query.perPage;
  const to = from + query.perPage - 1;

  // The same narrowing the directory applies, through the same helper: a
  // request must not mean one thing at /fr/sources and another at /api/v2.
  const narrowed = narrowSourcesQuery(
    supabase.from("sources").select("*", { count: "exact" }),
    {
      search: query.q ?? null,
      standing: query.tier ?? null,
      sourceKind: query.sourceKind ?? null,
      decade: query.decade ?? null,
      letter: null,
    }
  );

  const order = API_SORT_COLUMNS[query.sort ?? "title"];
  const { data, error, count } = await narrowed
    .order(order.column, { ascending: order.ascending })
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

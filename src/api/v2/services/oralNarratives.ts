import { createServerClient } from "@/lib/supabase/server";

export type OralNarrativeEntityType = "language_family" | "people" | "country";

export interface ListPublicOralNarrativesQuery {
  entityType: OralNarrativeEntityType;
  entityId: string;
  page: number;
  perPage: number;
}

export interface PublicOralNarrative {
  id: string;
  narrativeCode: string;
  narratorDisplayName: string | null;
  community: string;
  languageCode: string;
  narrativeKind: string;
  summary: string | null;
  variantOf: string | null;
}

export interface ListPublicOralNarrativesResult {
  data: PublicOralNarrative[];
  total: number;
}

const PUBLIC_NARRATIVE_SELECT =
  "id,narrative_code,narrator_display_name,community,language_code,narrative_kind,summary,variant_of,oral_narrative_links!inner(entity_type,entity_id)";

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

function mapPublicNarrative(row: Record<string, unknown>): PublicOralNarrative {
  return {
    id: getString(row, "id"),
    narrativeCode: getString(row, "narrative_code"),
    narratorDisplayName: getNullableString(row, "narrator_display_name"),
    community: getString(row, "community"),
    languageCode: getString(row, "language_code"),
    narrativeKind: getString(row, "narrative_kind"),
    summary: getNullableString(row, "summary"),
    variantOf: getNullableString(row, "variant_of"),
  };
}

// @req REQ-095
export async function listPublicOralNarratives(
  query: ListPublicOralNarrativesQuery
): Promise<ListPublicOralNarrativesResult> {
  const supabase = createServerClient();
  const from = (query.page - 1) * query.perPage;
  const to = from + query.perPage - 1;

  const { data, error, count } = await supabase
    .from("oral_narratives")
    .select(PUBLIC_NARRATIVE_SELECT, { count: "exact" })
    .eq("visibility", "public")
    .eq("review_status", "approved")
    .eq("rights_status", "cleared")
    .eq("oral_narrative_links.entity_type", query.entityType)
    .eq("oral_narrative_links.entity_id", query.entityId)
    .order("narrative_code")
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list public oral narratives: ${error.message}`);
  }

  const rows: Array<Record<string, unknown>> = data ?? [];
  return {
    data: rows.map(mapPublicNarrative),
    total: count ?? rows.length,
  };
}

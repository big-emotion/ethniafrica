/**
 * Supabase queries for AFRIK language families
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import type { ClassificationStatus, LanguageFamily } from "@/types/afrik";

/**
 * Get all AFRIK language families, optionally paginated and optionally
 * restricted to a set of ids.
 *
 * `ids` is how the Explorer families facet narrows to one country: the country
 * resolves to the families present in it, and the restriction travels to the
 * database so page 2 of a filtered list is the second page *of the filtered
 * set*. There are 24 families, so the `in.()` list is nowhere near the URL
 * length at which a PostgREST filter has to be batched.
 *
 * An empty `ids` is a selection, not the absence of one, and is answered here:
 * `id=in.()` is not a filter PostgREST is specified to answer.
 */
// @req REQ-110
export async function getAllAfrikLanguageFamilies(
  page?: number,
  perPage?: number,
  ids?: readonly string[]
): Promise<LanguageFamily[]> {
  if (ids?.length === 0) return [];

  const supabase = createServerClient();
  let query = supabase
    .from("afrik_language_families")
    .select("*")
    .order("name_fr");

  if (ids) {
    query = query.in("id", ids as string[]);
  }

  if (page && perPage) {
    const start = (page - 1) * perPage;
    query = query.range(start, start + perPage - 1);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching AFRIK language families", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    nameEn: row.name_en || undefined,
    classificationStatus:
      (row.classification_status as ClassificationStatus | null) ?? null,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

/**
 * Count all AFRIK language families, independent of any page/range applied
 * to a paginated fetch. Needed because a ranged .select() no longer reflects
 * the total row count once .range() is applied.
 */
// @req REQ-110
export async function countAfrikLanguageFamilies(
  ids?: readonly string[]
): Promise<number> {
  if (ids?.length === 0) return 0;

  const supabase = createServerClient();
  const query = supabase
    .from("afrik_language_families")
    .select("*", { count: "exact", head: true });

  const { count, error } = await (ids
    ? query.in("id", ids as string[])
    : query);

  if (error) {
    logger.error("Error counting AFRIK language families", error);
    throw error;
  }

  return count ?? 0;
}

/**
 * Every published family, as id and name only.
 *
 * The corpus's own family list, which is the only thing "unclassified peoples"
 * can be measured against — and the roster the facet labels its rows and its
 * globe panel from. The only unranged select in the families facet's reach:
 * twenty-four rows against PostgREST's 1000-row ceiling is the one case where
 * a paged walk would be ceremony.
 */
// @req REQ-108
export async function getAfrikLanguageFamilyRoster(): Promise<
  Array<{ id: string; nameFr: string }>
> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_language_families")
    .select("id, name_fr")
    .order("name_fr");

  if (error) {
    logger.error("Error fetching the AFRIK language family roster", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id as string,
    nameFr: row.name_fr as string,
  }));
}

/**
 * Get a single AFRIK language family by ID
 */
// @req REQ-033
export async function getAfrikLanguageFamilyById(
  id: string
): Promise<LanguageFamily | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_language_families")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(`Error fetching AFRIK language family ${id}`, error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    nameFr: data.name_fr,
    nameEn: data.name_en || undefined,
    classificationStatus:
      (data.classification_status as ClassificationStatus | null) ?? null,
    content: data.content || {},
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
}

/**
 * Search AFRIK language families by query
 */
// @req REQ-019
export async function searchAfrikLanguageFamilies(
  query: string
): Promise<LanguageFamily[]> {
  const supabase = createServerClient();
  const queryLower = query.toLowerCase();

  const { data, error } = await supabase
    .from("afrik_language_families")
    .select("*")
    .or(
      `id.ilike.%${queryLower}%,name_fr.ilike.%${queryLower}%,name_en.ilike.%${queryLower}%`
    )
    .order("name_fr");

  if (error) {
    logger.error("Error searching AFRIK language families", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    nameEn: row.name_en || undefined,
    classificationStatus:
      (row.classification_status as ClassificationStatus | null) ?? null,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

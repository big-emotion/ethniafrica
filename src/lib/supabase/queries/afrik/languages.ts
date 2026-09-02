/**
 * Supabase queries for AFRIK languages
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import type { Language } from "@/types/afrik";

// @req REQ-136
export interface AfrikLanguageDetail {
  id: string;
  name: string;
  family: {
    id: string;
    name: string;
  };
  content: Record<string, unknown>;
}

// @req REQ-136
export interface AfrikSpeakingPeople {
  id: string;
  name: string;
}

// @req REQ-136
export interface AfrikLanguageListItem {
  id: string;
  name: string;
  family: {
    id: string;
    name: string;
  };
}

// @req REQ-136
export interface ListAfrikLanguagesParams {
  page?: number;
  perPage?: number;
}

// @req REQ-136
export interface ListAfrikLanguagesResult {
  languages: AfrikLanguageListItem[];
  total: number;
  pageCount: number;
}

const DEFAULT_LANGUAGES_PAGE = 1;
const DEFAULT_LANGUAGES_PER_PAGE = 48;

/**
 * Count every AFRIK language in the corpus.
 *
 * Mirrors `countAfrikLanguageFamilies`: a `head: true` count rather than a
 * ranged fetch, because the home needs the corpus-wide total and never the
 * rows. It throws rather than returning 0 on error — zero is a valid total,
 * so the caller has to be able to tell an empty corpus from an unreadable one.
 */
// @req REQ-113
export async function countAfrikLanguages(): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from("afrik_languages")
    .select("*", { count: "exact", head: true });

  if (error) {
    logger.error("Error counting AFRIK languages", error);
    throw error;
  }

  return count ?? 0;
}

/**
 * Get all AFRIK languages belonging to a language family, ordered by name.
 * Returns [] for an unknown/empty family id (no throw).
 */
// @req REQ-033
export async function getAfrikLanguagesByFamily(
  familyId: string
): Promise<Language[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_languages")
    .select("*")
    .eq("family_id", familyId)
    .order("name");

  if (error) {
    logger.error(
      `Error fetching AFRIK languages for family ${familyId}`,
      error
    );
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    familyId: row.family_id,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

/**
 * Get one language with its family in a single query.
 */
// @req REQ-136
export async function getAfrikLanguageById(
  id: string
): Promise<AfrikLanguageDetail | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_languages")
    .select(
      "id, name, family_id, content, family:afrik_language_families(id, name_fr)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error(`Error fetching AFRIK language ${id}`, error);
    throw error;
  }

  if (!data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    family_id: string;
    content: Record<string, unknown> | null;
    family: { id: string; name_fr: string } | null;
  };

  return {
    id: row.id,
    name: row.name,
    family: {
      id: row.family?.id ?? row.family_id,
      name: row.family?.name_fr ?? row.family_id,
    },
    content: row.content ?? {},
  };
}

/**
 * One page of the languages index (748 rows, 532 distinct names — e.g.
 * "Fulfulde" names both `fuf` and `fuv`), so every row carries its family
 * alongside the id to disambiguate homonyms.
 *
 * Ordered by family then name to mirror the AFRIK hierarchy (family →
 * language → people → country) rather than a flat alphabetical list.
 */
// @req REQ-136
export async function listAfrikLanguages(
  params: ListAfrikLanguagesParams = {}
): Promise<ListAfrikLanguagesResult> {
  const page = params.page ?? DEFAULT_LANGUAGES_PAGE;
  const perPage = params.perPage ?? DEFAULT_LANGUAGES_PER_PAGE;
  const offset = (page - 1) * perPage;

  const supabase = createServerClient();
  const { data, error, count } = await supabase
    .from("afrik_languages")
    .select(
      "id, name, family_id, family:afrik_language_families(id, name_fr)",
      { count: "exact" }
    )
    .order("family_id")
    .order("name")
    .range(offset, offset + perPage - 1);

  if (error) {
    logger.error("Error listing AFRIK languages", error);
    throw error;
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    name: string;
    family_id: string;
    family: { id: string; name_fr: string } | null;
  }>;

  const languages: AfrikLanguageListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    family: {
      id: row.family?.id ?? row.family_id,
      name: row.family?.name_fr ?? row.family_id,
    },
  }));

  const total = count ?? languages.length;

  return {
    languages,
    total,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Get all peoples related to a language through the canonical join table.
 * The two-stage query stays constant as the number of peoples grows: one
 * relation lookup followed by one batched hydration query.
 */
// @req REQ-136
export async function getAfrikSpeakingPeoples(
  languageId: string
): Promise<AfrikSpeakingPeople[]> {
  const supabase = createServerClient();
  const { data: relationRows, error: relationsError } = await supabase
    .from("afrik_people_languages")
    .select("people_id")
    .eq("language_id", languageId);

  if (relationsError) {
    logger.error(
      `Error fetching peoples speaking AFRIK language ${languageId}`,
      relationsError
    );
    throw relationsError;
  }

  const peopleIds = Array.from(
    new Set(
      ((relationRows ?? []) as Array<{ people_id: string }>).map(
        (row) => row.people_id
      )
    )
  );

  if (peopleIds.length === 0) return [];

  const { data: peopleRows, error: peoplesError } = await supabase
    .from("afrik_peoples")
    .select("id, name_main")
    .in("id", peopleIds);

  if (peoplesError) {
    logger.error(
      `Error hydrating peoples speaking AFRIK language ${languageId}`,
      peoplesError
    );
    throw peoplesError;
  }

  return ((peopleRows ?? []) as Array<{ id: string; name_main: string }>).map(
    (row) => ({
      id: row.id,
      name: row.name_main,
    })
  );
}

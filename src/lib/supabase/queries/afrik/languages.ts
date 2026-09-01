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

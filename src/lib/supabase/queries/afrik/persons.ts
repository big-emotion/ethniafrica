/**
 * Supabase queries for the ARCH-018 person entity (migration 056).
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import { toSourceTier } from "@/types/sources";
import type {
  Person,
  PersonPeopleLink,
  PersonPeopleRelationLabel,
  PersonSource,
} from "@/types/persons";

async function getPersonPeopleLinks(
  supabase: ReturnType<typeof createServerClient>,
  personId: string
): Promise<PersonPeopleLink[]> {
  const { data, error } = await supabase
    .from("person_peoples")
    .select("people_id, relation_label")
    .eq("person_id", personId);

  if (error) {
    logger.error(`Error fetching person_peoples for ${personId}`, error);
    throw error;
  }

  return (data || []).map((row) => ({
    peopleId: row.people_id as string,
    relationLabel: row.relation_label as PersonPeopleRelationLabel,
  }));
}

async function getPersonCountryIds(
  supabase: ReturnType<typeof createServerClient>,
  personId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("person_countries")
    .select("country_id")
    .eq("person_id", personId);

  if (error) {
    logger.error(`Error fetching person_countries for ${personId}`, error);
    throw error;
  }

  return (data || []).map((row) => row.country_id as string);
}

/**
 * Attached sources, resolved through the Module 0 fabric indirection
 * (persons.assertion_id -> assertions.source_ids -> sources), the same path
 * the source-or-nothing trigger checks (056_person_schema.sql).
 */
async function getPersonSources(
  supabase: ReturnType<typeof createServerClient>,
  assertionId: string | null
): Promise<PersonSource[]> {
  if (!assertionId) return [];

  const { data: assertion, error: assertionError } = await supabase
    .from("assertions")
    .select("source_ids")
    .eq("id", assertionId)
    .maybeSingle();

  if (assertionError) {
    logger.error(`Error fetching assertion ${assertionId}`, assertionError);
    throw assertionError;
  }

  const sourceIds = (assertion?.source_ids as string[] | undefined) ?? [];
  if (sourceIds.length === 0) return [];

  const { data: sourceRows, error: sourcesError } = await supabase
    .from("sources")
    .select("title, author, year, url, tier, notes")
    .in("id", sourceIds);

  if (sourcesError) {
    logger.error(
      `Error fetching sources for assertion ${assertionId}`,
      sourcesError
    );
    throw sourcesError;
  }

  return (sourceRows || []).map((row) => ({
    title: row.title as string,
    author: row.author as string,
    year: row.year as number,
    url: row.url as string,
    tier: toSourceTier(row.tier),
    notes: (row.notes as string | null) ?? undefined,
  }));
}

/**
 * Get a single person by PER_ id, with its role category, people join
 * (membership/observation label), country join, and tiered sources.
 */
// @req REQ-137
export async function getPersonById(id: string): Promise<Person | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(`Error fetching person ${id}`, error);
    throw error;
  }

  if (!data) return null;

  const [peopleLinks, countryIds, sources] = await Promise.all([
    getPersonPeopleLinks(supabase, id),
    getPersonCountryIds(supabase, id),
    getPersonSources(supabase, data.assertion_id as string | null),
  ]);

  return {
    id: data.id as Person["id"],
    fullName: data.full_name as string,
    roleCategory: data.role_category as string,
    countryIds,
    peopleLinks,
    sources,
  };
}

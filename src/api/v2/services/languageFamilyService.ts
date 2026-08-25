/**
 * Language Family Service - Business logic for language families
 */

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
  countAfrikLanguageFamilies,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import { getAfrikPeoplesByLanguageFamily } from "@/lib/supabase/queries/afrik/peoples";
import type { LanguageFamily } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

/**
 * Get paginated list of language families
 *
 * Pagination is applied at the database layer (Supabase .range()) rather
 * than by fetching everything and slicing in memory: an unranged fetch is
 * silently capped by PostgREST's server-side max-rows setting, which made
 * some families permanently unreachable regardless of the requested page
 * size.
 */
// @req REQ-110
export async function getLanguageFamilies(
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResult<LanguageFamily>> {
  const [data, total] = await Promise.all([
    getAllAfrikLanguageFamilies(page, perPage),
    countAfrikLanguageFamilies(),
  ]);
  return { data, total };
}

/**
 * Get a single language family by FLG_ ID
 * Note: Individual items use direct query for now (less critical than lists)
 */
export async function getLanguageFamilyById(
  id: string
): Promise<LanguageFamily | null> {
  const family = await getAfrikLanguageFamilyById(id);

  if (!family) {
    return null;
  }

  const peoples = await getAfrikPeoplesByLanguageFamily(id);
  const associatedPeoples = peoples.map((people) => ({
    name: people.nameMain,
    peopleId: people.id,
  }));

  return {
    ...family,
    associatedPeoples,
    content: {
      ...family.content,
      associatedPeoples,
    },
  };
}

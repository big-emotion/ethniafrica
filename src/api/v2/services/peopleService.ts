/**
 * People Service - Business logic for peoples
 */

import {
  getAfrikPeopleById,
  getAfrikPeoplesByLanguageFamily,
  getPaginatedAfrikPeoples,
} from "@/lib/supabase/queries/afrik/peoples";
import type { PeopleQueryFilters } from "@/lib/supabase/queries/afrik/peoples";
import type { People } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

/**
 * Get paginated list of peoples
 */
export async function getPeoples(
  page: number = 1,
  perPage: number = 20,
  filters: PeopleQueryFilters = {}
): Promise<PaginatedResult<People>> {
  return getPaginatedAfrikPeoples(page, perPage, filters);
}

/**
 * Get a single people by PPL_ ID
 * Note: Individual items use direct query for now (less critical than lists)
 */
export async function getPeopleById(id: string): Promise<People | null> {
  return await getAfrikPeopleById(id);
}

/**
 * Get peoples by language family
 * Note: Filtered queries use direct query for now (less critical than lists)
 */
export async function getPeoplesByLanguageFamily(
  familyId: string
): Promise<People[]> {
  return await getAfrikPeoplesByLanguageFamily(familyId);
}

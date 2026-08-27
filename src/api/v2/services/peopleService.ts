/**
 * People Service - Business logic for peoples
 */

import {
  getAfrikPeopleById,
  getAfrikPeoplesByIds,
  getAfrikPeoplesByLanguageFamily,
  getPaginatedAfrikPeoples,
} from "@/lib/supabase/queries/afrik/peoples";
import type { PeopleQueryFilters } from "@/lib/supabase/queries/afrik/peoples";
import type { People } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

/**
 * Get paginated list of peoples
 */
// @req REQ-033
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
// @req REQ-019
export async function getPeopleById(id: string): Promise<People | null> {
  return await getAfrikPeopleById(id);
}

/**
 * Get peoples by language family
 * Note: Filtered queries use direct query for now (less critical than lists)
 */
// @req REQ-019
export async function getPeoplesByLanguageFamily(
  familyId: string
): Promise<People[]> {
  return await getAfrikPeoplesByLanguageFamily(familyId);
}

/**
 * Get the named peoples regardless of the family they carry.
 *
 * The family fiche resolves a macro-family's declared `associatedPeoples`
 * through this: those peoples carry a sub-family's id, so the by-family query
 * never reaches them (REQ-116).
 */
// @req REQ-116
export async function getPeoplesByIds(
  peopleIds: readonly string[]
): Promise<People[]> {
  return await getAfrikPeoplesByIds(peopleIds);
}

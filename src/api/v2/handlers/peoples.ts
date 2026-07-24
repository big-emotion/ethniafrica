/**
 * Peoples Handler - API handlers for peoples
 */

import { getPeoples, getPeopleById } from "../services/peopleService";
import type { PeopleQueryFilters } from "@/lib/supabase/queries/afrik/peoples";
import type { People, ApiResponse } from "@/types/afrik";
import { createPaginatedResponse } from "../utils/response";

/**
 * List peoples with pagination
 */
export async function listPeoplesHandler(
  page?: number,
  perPage?: number,
  filters: PeopleQueryFilters = {}
): Promise<ApiResponse<People[]>> {
  const { data, total } = await getPeoples(page, perPage, filters);
  return createPaginatedResponse(data, total, page, perPage);
}

/**
 * Get a single people by PPL_ ID
 */
export async function getPeopleHandler(id: string): Promise<People | null> {
  return await getPeopleById(id);
}

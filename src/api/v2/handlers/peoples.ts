/**
 * Peoples Handler - API handlers for peoples
 */

import { getPeoples, getPeopleById } from "../services/peopleService";
import type { PeopleQueryFilters } from "@/lib/supabase/queries/afrik/peoples";
import type { People } from "@/types/afrik";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

/**
 * List peoples with pagination
 */
// @req REQ-084
export async function listPeoplesHandler(
  page?: number,
  perPage?: number,
  filters: PeopleQueryFilters = {}
): Promise<ApiEnvelope<People[]>> {
  const { data, total } = await getPeoples(page, perPage, filters);
  const resolvedPage = page ?? 1;
  const resolvedPerPage = perPage ?? 20;

  return createApiResponse(data, {
    pagination: {
      total,
      page: resolvedPage,
      perPage: resolvedPerPage,
      totalPages: Math.ceil(total / resolvedPerPage),
    },
  });
}

/**
 * Get a single people by PPL_ ID
 */
// @req REQ-084
export async function getPeopleHandler(
  id: string
): Promise<ApiEnvelope<People> | null> {
  const people = await getPeopleById(id);
  return people ? createApiResponse(people) : null;
}

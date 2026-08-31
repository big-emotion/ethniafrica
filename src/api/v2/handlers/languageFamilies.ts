/**
 * Language Families Handler - API handlers for language families
 */

import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "@/api/v2/services/languageFamilyService";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { LanguageFamily } from "@/types/afrik";

/**
 * List language families with pagination
 */
// @req REQ-084
export async function listLanguageFamiliesHandler(
  page?: number,
  perPage?: number
): Promise<ApiEnvelope<LanguageFamily[]>> {
  const { data, total, unclassifiedPeoplesCount } = await getLanguageFamilies(
    page,
    perPage
  );
  const appliedPage = page ?? 1;
  const appliedPerPage = perPage ?? 20;

  return createApiResponse(data, {
    pagination: {
      total,
      page: appliedPage,
      perPage: appliedPerPage,
      totalPages: Math.ceil(total / appliedPerPage),
      unclassifiedPeoplesCount,
    },
  });
}

/**
 * Get a single language family by FLG_ ID
 */
// @req REQ-084
export async function getLanguageFamilyHandler(
  id: string
): Promise<ApiEnvelope<LanguageFamily> | null> {
  const family = await getLanguageFamilyById(id);
  return family ? createApiResponse(family) : null;
}

/**
 * Language Families Handler - API handlers for language families
 */

import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "../services/languageFamilyService";
import type { LanguageFamily, ApiResponse } from "@/types/afrik";
import { createPaginatedResponse } from "../utils/response";

/**
 * List language families with pagination
 */
export async function listLanguageFamiliesHandler(
  page?: number,
  perPage?: number
): Promise<ApiResponse<LanguageFamily[]>> {
  const { data, total } = await getLanguageFamilies(page, perPage);
  return createPaginatedResponse(data, total, page, perPage);
}

/**
 * Get a single language family by FLG_ ID
 */
export async function getLanguageFamilyHandler(
  id: string
): Promise<LanguageFamily | null> {
  return await getLanguageFamilyById(id);
}

/**
 * Language Families Handler - API handlers for language families
 */

import { DEFAULT_PAGE_SIZE } from "@/api/v2/schemas/pagination";
import {
  getLanguageFamilies,
  getLanguageFamilyById,
} from "@/api/v2/services/languageFamilyService";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
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
  const appliedPerPage = perPage ?? DEFAULT_PAGE_SIZE;

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
// @req REQ-142
export async function getLanguageFamilyHandler(
  id: string,
  lang: TranslationLocale = "fr"
): Promise<ApiEnvelope<LanguageFamily> | null> {
  const family = await getLanguageFamilyById(id, lang);
  if (!family) return null;

  const { translation, ...entity } = family;
  return createApiResponse(entity, { translation });
}

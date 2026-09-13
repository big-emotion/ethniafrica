/**
 * Language Families Handler - API handlers for language families
 */

import { pageNumberedListEnvelope } from "@/api/v2/handlers/listEnvelope";
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
  return pageNumberedListEnvelope(data, {
    total,
    page,
    perPage,
    extra: { unclassifiedPeoplesCount },
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

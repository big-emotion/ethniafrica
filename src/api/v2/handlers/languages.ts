import {
  publicLanguageSchema,
  type PublicLanguage,
} from "@/api/v2/schemas/languages";
import { serializeLanguage } from "@/api/v2/serializers/languages";
import { getLanguageById } from "@/api/v2/services/languageService";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";

// @req REQ-136
export type LanguageHandlerResult =
  | { ok: true; envelope: ApiEnvelope<PublicLanguage> }
  | { ok: false; code: "NOT_FOUND"; message: string };

// @req REQ-136
// @req REQ-142
export async function getLanguageHandler(
  id: string,
  lang: TranslationLocale = "fr"
): Promise<LanguageHandlerResult> {
  const language = await getLanguageById(id, lang);

  if (!language) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `Language not found: ${id}`,
    };
  }

  const { translation, ...detail } = language;
  const publicLanguage = publicLanguageSchema.parse(serializeLanguage(detail));

  return {
    ok: true,
    envelope: createApiResponse(publicLanguage, { translation }),
  };
}

import {
  publicLanguageSchema,
  type PublicLanguage,
} from "@/api/v2/schemas/languages";
import { serializeLanguage } from "@/api/v2/serializers/languages";
import { getLanguageById } from "@/api/v2/services/languageService";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";

// @req REQ-136
export type LanguageHandlerResult =
  | { ok: true; envelope: ApiEnvelope<PublicLanguage> }
  | { ok: false; code: "NOT_FOUND"; message: string };

// @req REQ-136
export async function getLanguageHandler(
  id: string
): Promise<LanguageHandlerResult> {
  const language = await getLanguageById(id);

  if (!language) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `Language not found: ${id}`,
    };
  }

  const publicLanguage = publicLanguageSchema.parse(
    serializeLanguage(language)
  );

  return {
    ok: true,
    envelope: createApiResponse(publicLanguage),
  };
}

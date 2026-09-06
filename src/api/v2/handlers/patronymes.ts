import {
  publicPatronymeSchema,
  type PublicPatronyme,
} from "@/api/v2/schemas/patronymes";
import { serializePatronyme } from "@/api/v2/serializers/patronymes";
import { getPatronymeById } from "@/api/v2/services/patronymes";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";

// @req REQ-133
export type PatronymeHandlerResult =
  | { ok: true; envelope: ApiEnvelope<PublicPatronyme> }
  | { ok: false; code: "NOT_FOUND"; message: string };

// @req REQ-133
// @req REQ-142
export async function getPatronymeHandler(
  id: string,
  lang: TranslationLocale = "fr"
): Promise<PatronymeHandlerResult> {
  const patronyme = await getPatronymeById(id, lang);

  if (!patronyme) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `Patronyme not found: ${id}`,
    };
  }

  const { translation, ...aggregate } = patronyme;
  const publicPatronyme = publicPatronymeSchema.parse(
    serializePatronyme(aggregate)
  );

  return {
    ok: true,
    envelope: createApiResponse(publicPatronyme, { translation }),
  };
}

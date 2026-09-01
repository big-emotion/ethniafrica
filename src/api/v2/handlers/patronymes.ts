import {
  publicPatronymeSchema,
  type PublicPatronyme,
} from "@/api/v2/schemas/patronymes";
import { serializePatronyme } from "@/api/v2/serializers/patronymes";
import { getPatronymeById } from "@/api/v2/services/patronymes";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";

// @req REQ-133
export type PatronymeHandlerResult =
  | { ok: true; envelope: ApiEnvelope<PublicPatronyme> }
  | { ok: false; code: "NOT_FOUND"; message: string };

// @req REQ-133
export async function getPatronymeHandler(
  id: string
): Promise<PatronymeHandlerResult> {
  const patronyme = await getPatronymeById(id);

  if (!patronyme) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `Patronyme not found: ${id}`,
    };
  }

  const publicPatronyme = publicPatronymeSchema.parse(
    serializePatronyme(patronyme)
  );

  return {
    ok: true,
    envelope: createApiResponse(publicPatronyme),
  };
}

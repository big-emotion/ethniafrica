import { getAgeConfirmedAt, insertFlag } from "../services/flags";
import { createApiError, createApiResponse } from "../utils/response";

interface FlagInput {
  entity_type: string;
  entity_id: string;
  flag_kind: string;
  reason_text?: string;
}

export async function handleFlagCreate(userId: string, input: FlagInput) {
  const ageConfirmedAt = await getAgeConfirmedAt(userId);

  if (!ageConfirmedAt) {
    return {
      error: createApiError({
        code: "AGE_CONFIRMATION_REQUIRED",
        message:
          "Age confirmation required (FR45). Complete your profile at /fr/compte/profil.",
      }),
      status: 403 as const,
    };
  }

  const flag = await insertFlag({ ...input, contributor_id: userId });
  return { data: createApiResponse(flag), status: 201 as const };
}

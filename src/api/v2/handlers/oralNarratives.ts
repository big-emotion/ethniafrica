import { listPublicOralNarratives } from "@/api/v2/services/oralNarratives";
import type { ListOralNarrativesQuery } from "@/api/v2/schemas/oralNarratives";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { PublicOralNarrative } from "@/api/v2/services/oralNarratives";

// @req REQ-095
export async function listOralNarrativesHandler(
  query: ListOralNarrativesQuery
): Promise<ApiEnvelope<PublicOralNarrative[]>> {
  const { entityType, entityId, page, perPage } = query;

  if (!entityType || !entityId || !page || !perPage) {
    throw new Error("Validated oral narrative query is incomplete");
  }

  const { data, total } = await listPublicOralNarratives({
    entityType,
    entityId,
    page,
    perPage,
  });

  return createApiResponse(data, {
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
}

import { listPublicMedia } from "@/api/v2/services/media";
import type { ListMediaQuery } from "@/api/v2/schemas/media";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { PublicMedia } from "@/api/v2/services/media";

// @req REQ-128
export async function listMediaHandler(
  query: ListMediaQuery
): Promise<ApiEnvelope<PublicMedia[]>> {
  const { entityType, entityId, page, perPage } = query;

  if (!entityType || !entityId || !page || !perPage) {
    throw new Error("Validated media query is incomplete");
  }

  const { data, total } = await listPublicMedia({
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

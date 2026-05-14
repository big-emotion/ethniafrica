/**
 * Sources handler — wraps the sources service in the Module #0 envelope.
 */

import { listSources, getSourceById } from "../services/sources";
import type { Source, ListSourcesQuery } from "@/api/v2/schemas/sources";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

export async function listSourcesHandler(
  query: ListSourcesQuery
): Promise<ApiEnvelope<Source[]>> {
  const { data, total } = await listSources(query);
  const totalPages = Math.max(1, Math.ceil(total / query.perPage));

  return createApiResponse(data, {
    pagination: {
      total,
      page: query.page,
      perPage: query.perPage,
      totalPages,
    },
  });
}

export async function getSourceHandler(
  id: string
): Promise<ApiEnvelope<Source> | null> {
  const source = await getSourceById(id);
  if (!source) return null;
  return createApiResponse(source);
}

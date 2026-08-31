/**
 * Names handler — wraps the names service in the Module #0 envelope.
 */

import { listNames } from "../services/names";
import type { ListNamesQuery, NameRecord } from "@/api/v2/schemas/names";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

export interface ListNamesData {
  names: NameRecord[];
  total: number;
}

export async function listNamesHandler(
  query: ListNamesQuery
): Promise<ApiEnvelope<ListNamesData>> {
  const { names, total } = await listNames(query);
  return createApiResponse<ListNamesData>({ names, total });
}

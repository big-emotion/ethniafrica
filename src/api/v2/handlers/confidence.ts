/**
 * Confidence handler — wraps the confidence service in the Module #0 envelope.
 */

import { getConfidenceFor } from "../services/confidence";
import type {
  ConfidenceEntityType,
  ConfidenceRecord,
} from "@/api/v2/schemas/confidence";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

export async function getConfidenceHandler(
  entityType: ConfidenceEntityType,
  entityId: string
): Promise<ApiEnvelope<ConfidenceRecord> | null> {
  const record = await getConfidenceFor(entityType, entityId);
  if (!record) return null;
  return createApiResponse(record, { confidence: record.score });
}

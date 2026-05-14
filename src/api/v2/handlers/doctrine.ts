/**
 * Doctrine handler — wraps the doctrine service in the Module #0 envelope.
 */

import { listDoctrine } from "../services/doctrine";
import type { DoctrineEntry } from "@/api/v2/schemas/doctrine";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

export async function listDoctrineHandler(): Promise<
  ApiEnvelope<DoctrineEntry[]>
> {
  const entries = await listDoctrine();
  return createApiResponse(entries);
}

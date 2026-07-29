/**
 * Fragmentation handler — assembles the AR8 envelope and maps AR9 error
 * semantics (404 NOT_FOUND / 422 SEMANTIC_ERROR) for the route layer.
 */

import {
  getPeopleFragmentation,
  PeopleFragmentationNotFoundError,
  InsufficientCountriesError,
} from "../services/peopleFragmentation";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

export type PeopleFragmentationHandlerResult =
  | { ok: true; envelope: ApiEnvelope<PeopleFragmentation> }
  | { ok: false; code: "NOT_FOUND" | "SEMANTIC_ERROR"; message: string };

export async function getPeopleFragmentationHandler(
  peopleId: string
): Promise<PeopleFragmentationHandlerResult> {
  try {
    const fragmentation = await getPeopleFragmentation(peopleId);
    return { ok: true, envelope: createApiResponse(fragmentation) };
  } catch (error) {
    if (error instanceof PeopleFragmentationNotFoundError) {
      return { ok: false, code: "NOT_FOUND", message: error.message };
    }
    if (error instanceof InsufficientCountriesError) {
      return { ok: false, code: "SEMANTIC_ERROR", message: error.message };
    }
    throw error;
  }
}

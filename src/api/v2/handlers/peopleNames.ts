/**
 * Names dossier handler (Story 8.6) — assembles the AR8 envelope and maps
 * AR9 error semantics (404 NOT_FOUND) for the route layer.
 */

import {
  getPeopleNamesDossier,
  PeopleNamesNotFoundError,
} from "../services/names";
import type { PeopleNamesDossier } from "@/api/v2/schemas/names";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

export type PeopleNamesHandlerResult =
  | { ok: true; envelope: ApiEnvelope<PeopleNamesDossier> }
  | { ok: false; code: "NOT_FOUND"; message: string };

export async function getPeopleNamesHandler(
  peopleId: string
): Promise<PeopleNamesHandlerResult> {
  try {
    const dossier = await getPeopleNamesDossier(peopleId);
    return { ok: true, envelope: createApiResponse(dossier) };
  } catch (error) {
    if (error instanceof PeopleNamesNotFoundError) {
      return { ok: false, code: "NOT_FOUND", message: error.message };
    }
    throw error;
  }
}

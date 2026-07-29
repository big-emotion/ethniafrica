/**
 * Language family tree handler — assembles the AR8 envelope and maps AR9
 * NOT_FOUND semantics for the route layer.
 */

import {
  getFamilyTreeSkeleton,
  type FamilyTreeSkeleton,
} from "../services/languageFamilyTreeService";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

export type LanguageFamilyTreeHandlerResult =
  | { ok: true; envelope: ApiEnvelope<FamilyTreeSkeleton> }
  | { ok: false; code: "NOT_FOUND"; message: string };

export async function getLanguageFamilyTreeHandler(
  familyId: string
): Promise<LanguageFamilyTreeHandlerResult> {
  const skeleton = await getFamilyTreeSkeleton(familyId);

  if (!skeleton) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `Language family not found: ${familyId}`,
    };
  }

  return { ok: true, envelope: createApiResponse(skeleton) };
}

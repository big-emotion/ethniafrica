/**
 * Language family tree handlers — the skeleton handler assembles the AR8
 * envelope and maps AR9 NOT_FOUND semantics, and the branch handler validates
 * the selector against the family's own languages (422 SEMANTIC_ERROR) and
 * assembles the paginated AR8 envelope for the route layer.
 */

import {
  getFamilyTreeSkeleton,
  getFamilyTreeBranch,
  type FamilyTreeSkeleton,
  type FamilyTreeBranchSelector,
  type FamilyTreeBranchPagination,
} from "../services/languageFamilyTreeService";
import { getAfrikLanguagesByFamily } from "@/lib/supabase/queries/afrik/languages";
import { createApiResponse, type ApiEnvelope } from "../utils/response";
import type { FamilyTreeBranchNode } from "@/api/v2/schemas/languageFamilyTree";

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

export type LanguageFamilyTreeBranchHandlerResult =
  | { ok: true; envelope: ApiEnvelope<FamilyTreeBranchNode[]> }
  | { ok: false; code: "SEMANTIC_ERROR"; message: string };

export async function getFamilyTreeBranchHandler(
  familyId: string,
  selector: FamilyTreeBranchSelector,
  pagination: FamilyTreeBranchPagination
): Promise<LanguageFamilyTreeBranchHandlerResult> {
  if ("language" in selector) {
    const languages = await getAfrikLanguagesByFamily(familyId);
    const isFamilyLanguage = languages.some(
      (language) => language.id === selector.language
    );
    if (!isFamilyLanguage) {
      return {
        ok: false,
        code: "SEMANTIC_ERROR",
        message: `Language "${selector.language}" is not a language of family ${familyId}`,
      };
    }
  }

  const result = await getFamilyTreeBranch(familyId, selector, pagination);

  return {
    ok: true,
    envelope: createApiResponse(result.nodes, {
      pagination: {
        total: result.total,
        page: Math.floor(pagination.offset / pagination.limit) + 1,
        perPage: pagination.limit,
      },
    }),
  };
}

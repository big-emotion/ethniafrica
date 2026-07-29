/**
 * Language Family Tree Service - assembles the classification tree
 * (skeleton + lazy branches) from batched AFRIK queries, no N+1 (AR17).
 */

import { getAfrikLanguageFamilyById } from "@/lib/supabase/queries/afrik/languageFamilies";
import { getAfrikLanguagesByFamily } from "@/lib/supabase/queries/afrik/languages";
import { getAfrikPeoplesByLanguageFamily } from "@/lib/supabase/queries/afrik/peoples";
import { logger } from "@/lib/api/logger";
import type {
  ClassificationStatus,
  LanguageFamily,
  People,
} from "@/types/afrik";

export interface FamilyTreeBranch {
  iso639_3: string;
  name: string;
  peopleCount: number;
}

export interface FamilyTreeSkeleton {
  family: LanguageFamily;
  branches: FamilyTreeBranch[];
  unlinkedPeopleCount: number;
}

export interface FamilyTreeBranchNode {
  id: string;
  nameMain: string;
  classificationStatus: ClassificationStatus | null;
}

export interface FamilyTreeBranchResult {
  nodes: FamilyTreeBranchNode[];
  total: number;
}

export type FamilyTreeBranchSelector =
  | { language: string }
  | { group: "unlinked" };

export interface FamilyTreeBranchPagination {
  limit: number;
  offset: number;
}

/**
 * People's language linkage lives in `content.languages.isoCodes`
 * (afrik_peoples has no per-language FK) — see ETNI-593.
 */
function getPeopleIsoCodes(people: People): string[] {
  return people.content?.languages?.isoCodes ?? [];
}

/**
 * Assemble the family tree skeleton from exactly three batched queries
 * (family, languages-by-family, peoples-by-family), grouped in memory.
 */
export async function getFamilyTreeSkeleton(
  familyId: string
): Promise<FamilyTreeSkeleton | null> {
  const family = await getAfrikLanguageFamilyById(familyId);

  if (!family) {
    logger.warn(
      "languageFamilyTreeService.getFamilyTreeSkeleton: unknown family id",
      { familyId }
    );
    return null;
  }

  const [languages, peoples] = await Promise.all([
    getAfrikLanguagesByFamily(familyId),
    getAfrikPeoplesByLanguageFamily(familyId),
  ]);

  const peopleCounts = new Map<string, number>();
  for (const language of languages) {
    peopleCounts.set(language.id, 0);
  }

  let unlinkedPeopleCount = 0;
  for (const people of peoples) {
    const matchingLanguageIds = getPeopleIsoCodes(people).filter((code) =>
      peopleCounts.has(code)
    );

    if (matchingLanguageIds.length === 0) {
      unlinkedPeopleCount += 1;
      continue;
    }

    for (const languageId of matchingLanguageIds) {
      peopleCounts.set(languageId, (peopleCounts.get(languageId) ?? 0) + 1);
    }
  }

  const branches: FamilyTreeBranch[] = languages.map((language) => ({
    iso639_3: language.id,
    name: language.name,
    peopleCount: peopleCounts.get(language.id) ?? 0,
  }));

  return { family, branches, unlinkedPeopleCount };
}

/**
 * Paginated people nodes for one language branch or the unlinked group.
 * A people belonging to several of the family's languages appears under
 * each matching branch, mirroring the skeleton's linkage rule.
 */
export async function getFamilyTreeBranch(
  familyId: string,
  selector: FamilyTreeBranchSelector,
  pagination: FamilyTreeBranchPagination
): Promise<FamilyTreeBranchResult> {
  const peoples = await getAfrikPeoplesByLanguageFamily(familyId);

  if (peoples.length === 0) {
    logger.warn(
      "languageFamilyTreeService.getFamilyTreeBranch: no peoples found for family",
      { familyId }
    );
    return { nodes: [], total: 0 };
  }

  let matched: People[];
  if ("language" in selector) {
    matched = peoples.filter((people) =>
      getPeopleIsoCodes(people).includes(selector.language)
    );
  } else {
    const languages = await getAfrikLanguagesByFamily(familyId);
    const familyLanguageIds = new Set(languages.map((language) => language.id));
    matched = peoples.filter((people) =>
      getPeopleIsoCodes(people).every((code) => !familyLanguageIds.has(code))
    );
  }

  const { limit, offset } = pagination;
  const page = matched.slice(offset, offset + limit);

  return {
    nodes: page.map((people) => ({
      id: people.id,
      nameMain: people.nameMain,
      classificationStatus: people.classificationStatus ?? null,
    })),
    total: matched.length,
  };
}

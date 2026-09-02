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
  LanguageFamilyId,
  People,
} from "@/types/afrik";

export interface FamilyTreeBranch {
  iso639_3: string;
  name: string;
  peopleCount: number;
}

// Deliberately excludes the family's `content` JSONB (the full editorial
// article, tens of KB for large families) — the tree header only needs
// id/names/status (@req AC3 ETNI-463: skeleton payload budget ≤ 15 KB).
export interface FamilyTreeSkeletonFamily {
  id: LanguageFamilyId;
  nameFr: string;
  nameEn?: string;
  classificationStatus?: ClassificationStatus | null;
}

/**
 * Which source produced the branches. Loaded language records are preferred;
 * when a family has none, the branches are reconstructed from what its people
 * fiches declare. The atlas charter §4 requires the fiche to say which of the
 * two it is showing rather than pass a derivation off as a declaration.
 */
export type FamilyBranchProvenance = "language-corpus" | "people-fiches";

export interface FamilyTreeSkeleton {
  family: FamilyTreeSkeletonFamily;
  branches: FamilyTreeBranch[];
  branchProvenance: FamilyBranchProvenance;
  /**
   * Branch names the family fiche states in `generalInfo.branches`
   * ("Peul-Sérère", "Wolof-BKK"…). No field ties a people to one of them, so
   * they are shown as a declared register, never as parents in the tree.
   */
  declaredBranches: string[];
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
  { language: string } | { group: "unlinked" };

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

/** Anything after one of these opens a gloss, not the language's name. */
const GLOSS_OPENERS = /[(;/,]/;

function leadingLanguageName(mainLanguage?: string): string | null {
  if (!mainLanguage) return null;
  const name = mainLanguage.split(GLOSS_OPENERS)[0].trim();
  return name.length > 0 && name.length <= 40 ? name : null;
}

/**
 * A people's `mainLanguage` is free prose — "Wolof (wol)", "Fulfulde / Pulaar
 * / Pular", "Groupe atlantique (branche de la famille Niger-Congo)" — so only
 * its leading segment reads as a language name, and only for the code the
 * people leads with: a secondary ISO code is never the subject of that
 * sentence. Where several peoples lead with the same code and disagree, the
 * majority reading wins; a tie yields nothing and the caller keeps the bare
 * code, which is exact even when it is unfriendly.
 */
function deriveLanguageNames(peoples: People[]): Map<string, string> {
  const readingsByCode = new Map<string, Map<string, number>>();

  for (const people of peoples) {
    const [leadCode] = getPeopleIsoCodes(people);
    if (!leadCode) continue;
    const name = leadingLanguageName(people.content?.languages?.mainLanguage);
    if (!name) continue;
    const readings = readingsByCode.get(leadCode) ?? new Map<string, number>();
    readings.set(name, (readings.get(name) ?? 0) + 1);
    readingsByCode.set(leadCode, readings);
  }

  const names = new Map<string, string>();
  for (const [code, readings] of readingsByCode) {
    const ranked = [...readings.entries()].sort(
      ([, left], [, right]) => right - left
    );
    const [[name, count]] = ranked;
    if (ranked.length === 1 || count > ranked[1][1]) names.set(code, name);
  }
  return names;
}

/**
 * Assemble the family tree skeleton from exactly three batched queries
 * (family, languages-by-family, peoples-by-family), grouped in memory.
 *
 * @req REQ-033
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

  const branchProvenance: FamilyBranchProvenance =
    languages.length > 0 ? "language-corpus" : "people-fiches";

  const branchIds =
    branchProvenance === "language-corpus"
      ? languages.map((language) => language.id)
      : [...new Set(peoples.flatMap(getPeopleIsoCodes))];

  const peopleCounts = new Map<string, number>(
    branchIds.map((branchId) => [branchId, 0])
  );

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

  const corpusNames = new Map(
    languages.map((language) => [language.id, language.name])
  );
  const derivedNames =
    branchProvenance === "people-fiches"
      ? deriveLanguageNames(peoples)
      : new Map<string, string>();

  const branches: FamilyTreeBranch[] = branchIds.map((branchId) => ({
    iso639_3: branchId,
    name: corpusNames.get(branchId) ?? derivedNames.get(branchId) ?? branchId,
    peopleCount: peopleCounts.get(branchId) ?? 0,
  }));

  // The corpus order is editorial and kept as-is; a derived list has no order
  // of its own, so it takes the one the reader can actually scan — the name.
  if (branchProvenance === "people-fiches") {
    branches.sort((left, right) => left.name.localeCompare(right.name, "fr"));
  }

  const skeletonFamily: FamilyTreeSkeletonFamily = {
    id: family.id,
    nameFr: family.nameFr,
    nameEn: family.nameEn,
    classificationStatus: family.classificationStatus,
  };

  return {
    family: skeletonFamily,
    branches,
    branchProvenance,
    declaredBranches: family.content?.generalInfo?.branches ?? [],
    unlinkedPeopleCount,
  };
}

/**
 * Paginated people nodes for one language branch or the unlinked group.
 * A people belonging to several of the family's languages appears under
 * each matching branch, mirroring the skeleton's linkage rule.
 *
 * @req REQ-033
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
    // Mirrors the skeleton's rule: with no language corpus the branches come
    // from the peoples' own ISO codes, so only a people declaring none of
    // them is unlinked. Reading "matches no corpus language" here instead
    // would put every people in the unlinked group.
    matched =
      languages.length > 0
        ? peoples.filter((people) =>
            getPeopleIsoCodes(people).every(
              (code) => !familyLanguageIds.has(code)
            )
          )
        : peoples.filter((people) => getPeopleIsoCodes(people).length === 0);
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

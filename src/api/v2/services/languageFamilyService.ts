/**
 * Language Family Service - Business logic for language families
 */

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
  countAfrikLanguageFamilies,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import {
  getAfrikPeoplesByLanguageFamily,
  getPeopleCountsByLanguageFamily,
  UNCLASSIFIED_FAMILY_KEY,
} from "@/lib/supabase/queries/afrik/peoples";
import type { LanguageFamily } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

export interface LanguageFamiliesResult extends PaginatedResult<LanguageFamily> {
  /**
   * Peoples whose language_family_id is null or references a family absent
   * from the returnable list — surfaced instead of silently omitted (REQ-108).
   */
  unclassifiedPeoplesCount: number;
}

/**
 * Get paginated list of language families.
 *
 * Pagination is applied at the database layer (Supabase .range()) rather than
 * by fetching everything and slicing in memory: an unranged fetch is silently
 * capped by PostgREST's server-side max-rows setting, which made some families
 * permanently unreachable regardless of the requested page size (REQ-110).
 *
 * Each returned family carries a peopleCount computed from stored afrik_peoples
 * rows — not the fiche-declared content.associatedPeoples length — and peoples
 * whose language_family_id is null or references a family absent from the
 * returnable list are surfaced via unclassifiedPeoplesCount instead of being
 * silently omitted (REQ-108).
 */
// @req REQ-108
// @req REQ-110
export async function getLanguageFamilies(
  page: number = 1,
  perPage: number = 20
): Promise<LanguageFamiliesResult> {
  const [families, total, peopleCounts] = await Promise.all([
    getAllAfrikLanguageFamilies(page, perPage),
    countAfrikLanguageFamilies(),
    getPeopleCountsByLanguageFamily(),
  ]);

  const familyIds = new Set(families.map((family) => family.id));
  let unclassifiedPeoplesCount = 0;
  for (const [familyId, count] of peopleCounts) {
    if (familyId === UNCLASSIFIED_FAMILY_KEY || !familyIds.has(familyId)) {
      unclassifiedPeoplesCount += count;
    }
  }

  for (const family of families) {
    family.peopleCount = peopleCounts.get(family.id) ?? 0;
  }

  return {
    data: families,
    total: total ?? families.length,
    unclassifiedPeoplesCount,
  };
}

/**
 * Get a single language family by FLG_ ID
 * Note: Individual items use direct query for now (less critical than lists)
 */
export async function getLanguageFamilyById(
  id: string
): Promise<LanguageFamily | null> {
  const family = await getAfrikLanguageFamilyById(id);

  if (!family) {
    return null;
  }

  const peoples = await getAfrikPeoplesByLanguageFamily(id);
  const associatedPeoples = peoples.map((people) => ({
    name: people.nameMain,
    peopleId: people.id,
  }));

  return {
    ...family,
    associatedPeoples,
    content: {
      ...family.content,
      associatedPeoples,
    },
  };
}

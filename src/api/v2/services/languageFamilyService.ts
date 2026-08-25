/**
 * Language Family Service - Business logic for language families
 */

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
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
 * Get paginated list of language families, with a peopleCount computed from
 * stored afrik_peoples rows (not fiche-declared content) on each family
 * (REQ-108).
 */
export async function getLanguageFamilies(
  page: number = 1,
  perPage: number = 20
): Promise<LanguageFamiliesResult> {
  const [all, peopleCounts] = await Promise.all([
    getAllAfrikLanguageFamilies(),
    getPeopleCountsByLanguageFamily(),
  ]);

  const familyIds = new Set(all.map((family) => family.id));
  let unclassifiedPeoplesCount = 0;
  for (const [familyId, count] of peopleCounts) {
    if (familyId === UNCLASSIFIED_FAMILY_KEY || !familyIds.has(familyId)) {
      unclassifiedPeoplesCount += count;
    }
  }

  const withCounts: LanguageFamily[] = all.map((family) => ({
    ...family,
    peopleCount: peopleCounts.get(family.id) ?? 0,
  }));

  const start = (page - 1) * perPage;
  const data = withCounts.slice(start, start + perPage);

  return { data, total: withCounts.length, unclassifiedPeoplesCount };
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

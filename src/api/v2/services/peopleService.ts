/**
 * People Service - Business logic for peoples
 */

import { unstable_cache } from "next/cache";
import {
  getAllAfrikPeoples,
  getAfrikPeopleById,
  getAfrikPeoplesByLanguageFamily,
} from "@/lib/supabase/queries/afrik/peoples";
import type { People } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

// Cache with 24h revalidation
const getCachedAllPeoples = unstable_cache(
  async () => getAllAfrikPeoples(),
  ["afrik-peoples-all"],
  { revalidate: 86400 }
);

/**
 * Get paginated list of peoples
 */
export async function getPeoples(
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResult<People>> {
  const all = await getCachedAllPeoples();
  const start = (page - 1) * perPage;
  const data = all.slice(start, start + perPage);
  return { data, total: all.length };
}

/**
 * Get a single people by PPL_ ID
 */
export async function getPeopleById(id: string): Promise<People | null> {
  const cachedGetPeople = unstable_cache(
    async () => getAfrikPeopleById(id),
    [`afrik-people-${id}`],
    { revalidate: 86400 }
  );
  return await cachedGetPeople();
}

/**
 * Get peoples by language family
 */
export async function getPeoplesByLanguageFamily(
  familyId: string
): Promise<People[]> {
  const cachedGetPeoplesByFamily = unstable_cache(
    async () => getAfrikPeoplesByLanguageFamily(familyId),
    [`afrik-peoples-by-family-${familyId}`],
    { revalidate: 86400 }
  );
  return await cachedGetPeoplesByFamily();
}

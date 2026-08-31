/**
 * Language Family Service - Business logic for language families
 */

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
  countAfrikLanguageFamilies,
  getAfrikLanguageFamilyRoster,
} from "@/lib/supabase/queries/afrik/languageFamilies";
import { countUnclassifiedPeoples } from "@/lib/supabase/queries/afrik/languageFamilyFacet";
import {
  getAfrikPeoplesByLanguageFamily,
  getPeopleCountsByLanguageFamily,
} from "@/lib/supabase/queries/afrik/peoples";
import type { LanguageFamily } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";

export interface LanguageFamiliesResult extends PaginatedResult<LanguageFamily> {
  /**
   * Peoples no published family reaches — a null language_family_id, or one
   * pointing at a family the corpus does not publish. Surfaced instead of
   * silently omitted (REQ-108), and measured against the whole roster: it
   * describes the corpus, so paging through a reading of it cannot move it.
   */
  unclassifiedPeoplesCount: number;
}

export interface LanguageFamilyListOptions {
  /**
   * Restrict the list to these families. The Explorer families facet resolves
   * its country filter to a set of ids and hands it over, so the narrowing
   * happens in the database rather than over rows already fetched.
   */
  ids?: readonly string[];
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
 * no published family reaches are surfaced via unclassifiedPeoplesCount
 * instead of being silently omitted (REQ-108).
 *
 * That count is asked of the whole family roster, never of the page being
 * returned. Subtracting against the page made it a property of where the
 * reader had got to: turning to page 2 changed how many peoples the corpus was
 * said to leave unclassified, and asking for a single-family page — which the
 * directory's own loader did — reported almost the entire corpus as
 * unclassified.
 */
// @req REQ-108
// @req REQ-110
export async function getLanguageFamilies(
  page: number = 1,
  perPage: number = 20,
  options: LanguageFamilyListOptions = {}
): Promise<LanguageFamiliesResult> {
  const [families, total, peopleCounts, roster] = await Promise.all([
    getAllAfrikLanguageFamilies(page, perPage, options.ids),
    countAfrikLanguageFamilies(options.ids),
    getPeopleCountsByLanguageFamily(),
    getAfrikLanguageFamilyRoster(),
  ]);

  const unclassifiedPeoplesCount = await countUnclassifiedPeoples(
    roster.map((family) => family.id)
  );

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
 * Union of `currentCountries` over the peoples carrying this family's id —
 * the "footprint" the atlas charter defines (docs/design/atlas-charter.md
 * §1). Always derived from other records, never the fiche's own declared
 * `content.distribution` (REQ-119).
 */
function computeFootprintByCountry(
  peoples: { currentCountries: string[] }[]
): Record<string, number> {
  const footprint: Record<string, number> = {};
  for (const people of peoples) {
    for (const countryId of people.currentCountries) {
      footprint[countryId] = (footprint[countryId] ?? 0) + 1;
    }
  }
  return footprint;
}

/**
 * Get a single language family by FLG_ ID
 * Note: Individual items use direct query for now (less critical than lists)
 */
// @req REQ-033
// @req REQ-119
export async function getLanguageFamilyById(
  id: string
): Promise<LanguageFamily | null> {
  const family = await getAfrikLanguageFamilyById(id);

  if (!family) {
    return null;
  }

  const peoples = await getAfrikPeoplesByLanguageFamily(id);
  const derived = peoples.map((people) => ({
    name: people.nameMain,
    peopleId: people.id,
  }));

  /**
   * Derived beats declared — but only when there is something derived.
   *
   * REQ-033 replaces the fiche's `content.associatedPeoples` with the peoples
   * that actually carry this family's id, because the JSONB list goes stale
   * and the stored rows do not. That holds for every family with members.
   *
   * It does not hold for a macro-family. Afro-asiatique's peoples all carry a
   * sub-family's id (Berbère, Tchadique, Couchitique, Sémitique), so the query
   * returns nothing — and overwriting the declaration with an empty array
   * destroyed the eight references the fiche does declare while putting
   * nothing in their place. The footprint fallback added for exactly that case
   * reads this field, so it could never fire: the fiche showed "empreinte
   * géographique non disponible" over a family that names its members.
   *
   * An empty derivation is not a correction. It is the absence of one.
   */
  const associatedPeoples =
    derived.length > 0 ? derived : (family.content?.associatedPeoples ?? []);

  return {
    ...family,
    associatedPeoples,
    footprintByCountry: computeFootprintByCountry(peoples),
    content: {
      ...family.content,
      associatedPeoples,
    },
  };
}

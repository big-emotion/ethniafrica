import { unstable_cache } from "next/cache";

import { getAfrikLanguageFamilyRoster } from "@/lib/supabase/queries/afrik/languageFamilies";
import { getCountryIdsByLanguageFamily } from "@/lib/supabase/queries/afrik/languageFamilyFacet";

export interface LanguageFamilyPresence {
  id: string;
  nameFr: string;
  /** ISO 3166-1 alpha-3 of every country a people carrying this family's id lives in. */
  countryIds: string[];
}

/**
 * Where each published family stands on the map, for the Explorer families
 * facet: what the country filter narrows by, and what the globe's panel reads
 * when a reader picks a country.
 *
 * Every family is listed, including the ones the derivation places nowhere.
 * Afro-asiatique is the corpus's one such family — its peoples all carry a
 * sub-family's id — and it belongs in the reading list with an empty
 * footprint rather than being dropped to make the map look complete.
 *
 * Cached for an hour, like the continent counts (DEC-018): the corpus moves on
 * an editorial cadence, and this is a walk of two whole tables that all three
 * pages of the facet would otherwise repeat. Returned as an array rather than
 * a Map because `unstable_cache` persists by serialization, and a Map comes
 * back from that as an empty object.
 */
// @req REQ-117
export const getLanguageFamilyPresence = unstable_cache(
  async (): Promise<LanguageFamilyPresence[]> => {
    const [roster, countriesByFamily] = await Promise.all([
      getAfrikLanguageFamilyRoster(),
      getCountryIdsByLanguageFamily(),
    ]);

    return roster.map((family) => ({
      id: family.id,
      nameFr: family.nameFr,
      countryIds: countriesByFamily.get(family.id) ?? [],
    }));
  },
  ["language-family-presence"],
  { revalidate: 3600 }
);

import { unstable_cache } from "next/cache";

import { getPeopleCountsByCountry } from "@/lib/supabase/queries/afrik/peopleCountryCounts";
import type { CountryId } from "@/types/afrik";

/**
 * Documented peoples per country, for the continent scene the /fr/explorer
 * hub opens on. Cached for an hour (DEC-018): the corpus moves on an
 * editorial cadence, so paying a full walk of the join table on every hub
 * render buys nothing.
 *
 * Returned as a plain record rather than the query layer's Map because
 * unstable_cache persists its value by serialization, and a Map comes back
 * from that as an empty object.
 */
// @req REQ-116
export const getContinentPeopleCounts = unstable_cache(
  async (): Promise<Record<CountryId, number>> =>
    Object.fromEntries(await getPeopleCountsByCountry()),
  ["continent-people-counts"],
  { revalidate: 3600 }
);

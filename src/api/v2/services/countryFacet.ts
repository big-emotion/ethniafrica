import { unstable_cache } from "next/cache";

import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { getCountryIndex } from "@/api/v2/services/countryService";
import { getFrenchCountryCommonName } from "@/lib/countryNames";
import { getLanguageFamilyIdsByCountry } from "@/lib/supabase/queries/afrik/countryLanguageFamilies";
import { getLanguageFamilyLabels } from "@/lib/supabase/queries/afrik/languageFamilyLabels";
import type { CountryId } from "@/types/afrik";

/**
 * What the countries facet reads: the countries the current filters leave,
 * already named the way the reader will see them and already in order.
 *
 * The facet loads its selection *whole* — 54 countries, no pagination (see
 * `getCountryFacetSelection`) — which is what makes ordering here honest
 * rather than a client-side sort of a page. Neither of the two orders could
 * have been a database `order()` anyway: the displayed name is derived from
 * the ISO code and never stored, and the ranking figure is an aggregate over
 * the people/country join table.
 */

/** The orders the facet offers, in the words its URL carries. */
export type CountryFacetSort = "nom" | "peuples";

export interface CountryFacetRow {
  id: CountryId;
  /** The name the fiche heads itself with — see `countryLabel`. */
  label: string;
  /** Peoples the corpus records in this country; 0 when it records none. */
  documentedPeopleCount: number;
}

export interface CountryFacetFamilyOption {
  value: string;
  label: string;
}

export interface CountryFacetFilters {
  /** A family id, or null when the reader set no filter. */
  languageFamilyId: string | null;
  sort: CountryFacetSort;
}

export interface CountryFacetSelection {
  rows: CountryFacetRow[];
  familyOptions: CountryFacetFamilyOption[];
  /** Countries in the corpus, filters ignored — what the page counts under its heading. */
  totalCountries: number;
}

/**
 * The order the URL asks for, or the name order.
 *
 * Anything unrecognised is a hand-edited URL, and the honest answer to one is
 * the default view rather than an empty page.
 */
// @req REQ-108
export function parseCountryFacetSort(raw: string | null): CountryFacetSort {
  return raw === "peuples" ? "peuples" : "nom";
}

/**
 * Cached for an hour, like the continent counts beside it: this is a fold over
 * the whole peoples corpus, the corpus moves on an editorial cadence, and the
 * facet would otherwise pay two full walks on every render.
 *
 * Returned as a plain record because `unstable_cache` persists by
 * serialization, and a Map comes back from that as an empty object.
 */
const getCachedFamilyIdsByCountry = unstable_cache(
  async (): Promise<Record<string, string[]>> =>
    Object.fromEntries(await getLanguageFamilyIdsByCountry()),
  ["country-facet-language-families"],
  { revalidate: 3600 }
);

/**
 * The name a reader recognises.
 *
 * `getFrenchCountryCommonName` is the same resolver `mapCountryDetail` runs for
 * a fiche's heading, so the list row, the globe panel's row and the fiche all
 * say one thing. Two other name tables were available and both were rejected:
 * the corpus's own `name_fr` is the fiche's declared name, which drifts toward
 * the official form, and the admin-0 asset's name belongs to the geometry —
 * keyed by Natural Earth, not ISO, and absent for any country the asset cannot
 * draw. The list is the guaranteed way into a fiche, so it must be able to
 * name a country the map cannot.
 *
 * The cost is real and is accepted knowingly: CLDR writes "Nigeria" where the
 * fiche wrote "Nigéria", and "Congo-Kinshasa" for the RDC. That divergence is
 * already on screen — it is the country fiche's heading today — so a list that
 * followed the corpus instead would promise one name and open another.
 * Correcting it belongs on the fiche, once, not in a second table here.
 */
function countryLabel(id: string, corpusName: string): string {
  return getFrenchCountryCommonName(id, corpusName);
}

/**
 * The countries the filters leave, named and ordered.
 *
 * No pagination, deliberately: the corpus holds 54 countries and the facet's
 * whole point is that the reader can see the continent listed at once. That is
 * also what lets the ordering happen here — the selection is never a page of a
 * larger set, so sorting it is sorting all of it.
 */
// @req REQ-116
export async function getCountryFacetSelection(
  filters: CountryFacetFilters
): Promise<CountryFacetSelection> {
  const [countries, peopleCounts, familiesByCountry, familyLabels] =
    await Promise.all([
      getCountryIndex(),
      getContinentPeopleCounts(),
      getCachedFamilyIdsByCountry(),
      getLanguageFamilyLabels(),
    ]);

  const rows: CountryFacetRow[] = countries
    .filter((country) => {
      if (!filters.languageFamilyId) return true;
      return (familiesByCountry[country.id] ?? []).includes(
        filters.languageFamilyId
      );
    })
    .map((country) => ({
      id: country.id as CountryId,
      label: countryLabel(country.id, country.nameFr),
      documentedPeopleCount: peopleCounts[country.id] ?? 0,
    }));

  const byName = (first: CountryFacetRow, second: CountryFacetRow) =>
    first.label.localeCompare(second.label, "fr");

  rows.sort((first, second) =>
    filters.sort === "peuples"
      ? second.documentedPeopleCount - first.documentedPeopleCount ||
        byName(first, second)
      : byName(first, second)
  );

  // Only the families some country actually holds. An option that can only
  // ever return nothing leaves the reader unable to tell a mistyped URL from
  // a corpus that says nothing on the subject.
  const present = new Set(Object.values(familiesByCountry).flat());
  const familyOptions = familyLabels
    .filter((family) => present.has(family.id))
    .map((family) => ({ value: family.id, label: family.nameFr }));

  return { rows, familyOptions, totalCountries: countries.length };
}

import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { getCountryIndex } from "@/api/v2/services/countryService";
import { getAllAfrikLanguageFamilies } from "@/lib/supabase/queries/afrik/languageFamilies";
import {
  getAfrikPeopleCountryIndex,
  getPaginatedAfrikPeoples,
  getPeopleCountsByLanguageFamily,
  type PeopleCountryIndexRow,
  type PeopleQueryFilters,
} from "@/lib/supabase/queries/afrik/peoples";
import type { People } from "@/types/afrik";

/**
 * What the peoples facet of the Explorer hub reads.
 *
 * Its own service rather than a tail on `peopleService`: that one answers
 * "give me peoples" for the public API, while this one answers the three
 * questions one screen asks together — the page being read, the filters it may
 * be narrowed by, and what the shared map should say about each country under
 * those filters. Keeping them together is what stops the list and the globe
 * panel being narrowed by two different notions of "the current selection".
 */

/** The reader's narrowing, as it arrives from the query string: null is "no filter". */
export interface PeoplesFacetFilters {
  familyId: string | null;
  countryId: string | null;
  letter: string | null;
}

export interface PeoplesFacetOption {
  id: string;
  label: string;
}

export interface PeoplesFacetChoices {
  families: PeoplesFacetOption[];
  countries: PeoplesFacetOption[];
}

export interface PeoplesFacetPage {
  peoples: People[];
  page: number;
  total: number;
  totalPages: number;
}

/**
 * Twenty is what the directory this facet replaces showed, and the figure the
 * corpus was sized against: ~790 peoples is forty pages, which a reader can
 * walk. It is not a tuning knob — changing it changes every address already
 * sent, since the page number is in the URL.
 */
// @req REQ-108
export const PEOPLES_FACET_PER_PAGE = 20;

/** The facet's filters in the shape the query layer names them. */
function toQueryFilters(filters: PeoplesFacetFilters): PeopleQueryFilters {
  const query: PeopleQueryFilters = {};
  if (filters.familyId) query.languageFamilyId = filters.familyId;
  if (filters.countryId) query.countryId = filters.countryId;
  if (filters.letter) query.initialLetter = filters.letter;
  return query;
}

/**
 * One page of the facet, narrowed at the database.
 *
 * The total comes back from the same narrowed query, so the pager describes
 * the filtered set. A page count derived from the corpus while the rows are
 * filtered is how a reader is offered a page nine that cannot exist.
 */
// @req REQ-108
export async function getPeoplesFacetPage(
  page: number,
  filters: PeoplesFacetFilters
): Promise<PeoplesFacetPage> {
  // The page number is typed into an address bar as readily as it is clicked.
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;

  const { data, total } = await getPaginatedAfrikPeoples(
    requested,
    PEOPLES_FACET_PER_PAGE,
    toQueryFilters(filters)
  );

  return {
    peoples: data,
    page: requested,
    total,
    totalPages: Math.ceil(total / PEOPLES_FACET_PER_PAGE),
  };
}

/**
 * Every people of the current selection, with the countries it touches.
 *
 * Same filters as the list, deliberately: the panel the map opens is meant to
 * read as "what the page you are on has here", and it can only mean that if
 * both are narrowed by one description of the selection.
 */
// @req REQ-117
export async function getPeoplesFacetCountryIndex(
  filters: PeoplesFacetFilters
): Promise<PeopleCountryIndexRow[]> {
  return getAfrikPeopleCountryIndex(toQueryFilters(filters));
}

/**
 * What the reader may narrow to.
 *
 * Only families and countries the corpus actually documents a people in. An
 * option that can only ever return nothing reads as a claim that the corpus
 * holds that family, and answers "aucun peuple" when the reader takes the
 * claim up — the emptiest possible way to describe a gap the fiches state
 * properly elsewhere.
 *
 * The country counts are the same hourly-cached read the Explorer layout
 * already makes for the globe's shading, so the second use costs nothing.
 */
// @req REQ-106
export async function getPeoplesFacetChoices(): Promise<PeoplesFacetChoices> {
  const [families, familyCounts, countries, countryCounts] = await Promise.all([
    getAllAfrikLanguageFamilies(),
    getPeopleCountsByLanguageFamily(),
    getCountryIndex(),
    getContinentPeopleCounts(),
  ]);

  const byFrenchLabel = (a: PeoplesFacetOption, b: PeoplesFacetOption) =>
    a.label.localeCompare(b.label, "fr");

  return {
    families: families
      .filter((family) => (familyCounts.get(family.id) ?? 0) > 0)
      .map((family) => ({ id: family.id, label: family.nameFr }))
      .sort(byFrenchLabel),
    countries: countries
      .filter((country) => (countryCounts[country.id] ?? 0) > 0)
      .map((country) => ({ id: country.id, label: country.nameFr }))
      .sort(byFrenchLabel),
  };
}

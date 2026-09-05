/**
 * The two orderings the family parchment reads from — kept out of the
 * components so the ranking a reader sees is the same fact the globe drew,
 * and so both can be tested without rendering anything.
 */
import {
  getAdmin0Name,
  type FamilyFootprintCountry,
} from "@/lib/atlas/overlays";
import { flagFromISO3 } from "@/lib/countryFlag";
import type { CountryId } from "@/types/afrik";

/** How many member peoples the parchment lists before it stops and says so. */
// @req REQ-116
export const MEMBER_PEOPLES_SHOWN = 10;

export interface FootprintRankingRow {
  countryId: CountryId;
  nameFr: string;
  flag: string;
  memberCount: number;
  /** Relative to the densest country, which fills the bar. */
  barWidthPercent: number;
}

/**
 * The footprint as a ranked list. Order comes from the overlay untouched: the
 * globe, the country picker and this ranking must agree about which country is
 * first, or the page contradicts itself between its map and its text.
 */
// @req REQ-116
export function rankFootprint(
  countries: readonly FamilyFootprintCountry[]
): FootprintRankingRow[] {
  return countries.map((country) => ({
    countryId: country.countryId,
    // The admin-0 asset's own French name — the same one the picker shows,
    // through the ISO alias the globe resolves (South Sudan is SDS there).
    nameFr: getAdmin0Name(country.countryId, "fr") ?? country.countryId,
    flag: flagFromISO3(country.countryId),
    memberCount: country.memberCount,
    barWidthPercent: country.weight * 100,
  }));
}

/**
 * The same ranking, from the family's own derived footprint map.
 *
 * The parchment needs to stand up on its own — rendered from a fiche alone, in
 * a test or a story, with no globe overlay threaded in beside it. Both routes
 * read the same counts and apply the same rule (density descending, ties on the
 * country id), so they cannot disagree about the order.
 *
 * Countries the admin-0 asset cannot draw are dropped, matching the overlay:
 * the sentence beside this ranking counts "les N pays teintés", and a country
 * the map never tinted has no business being counted among them.
 */
// @req REQ-116
export function rankFootprintFromCounts(
  countsByCountry: Readonly<Record<string, number>>
): FootprintRankingRow[] {
  const entries = Object.entries(countsByCountry).filter(
    ([countryId]) => getAdmin0Name(countryId, "fr") !== undefined
  );
  if (entries.length === 0) return [];

  const densest = Math.max(...entries.map(([, count]) => count));

  return entries
    .sort(
      ([aId, aCount], [bId, bCount]) =>
        bCount - aCount || aId.localeCompare(bId)
    )
    .map(([countryId, memberCount]) => ({
      countryId,
      nameFr: getAdmin0Name(countryId, "fr") ?? countryId,
      flag: flagFromISO3(countryId),
      memberCount,
      barWidthPercent: densest > 0 ? (memberCount / densest) * 100 : 0,
    }));
}

export interface MemberPeopleLike {
  id: string;
  nameMain: string;
  currentCountries: CountryId[];
}

export interface MemberPeopleRow {
  id: string;
  nameMain: string;
  countryIds: CountryId[];
}

/**
 * Member peoples "classés par étendue": by how many countries each reaches,
 * widest first, so the list opens on the peoples that carry the family
 * furthest rather than on whichever the corpus happened to store first.
 *
 * Ties break on the name. Most families have many peoples in a single country,
 * so reach alone leaves long stretches unordered and the list would reshuffle
 * between two renders of the same data.
 */
// @req REQ-116
export function rankMemberPeoplesByReach(
  peoples: readonly MemberPeopleLike[],
  limit: number = MEMBER_PEOPLES_SHOWN
): MemberPeopleRow[] {
  return peoples
    .map((people) => ({
      id: people.id,
      nameMain: people.nameMain,
      // currentCountries is a declared list, not a set: a repeat would
      // otherwise inflate this people's apparent reach.
      countryIds: Array.from(new Set(people.currentCountries)),
    }))
    .sort(
      (a, b) =>
        b.countryIds.length - a.countryIds.length ||
        a.nameMain.localeCompare(b.nameMain, "fr")
    )
    .slice(0, limit);
}

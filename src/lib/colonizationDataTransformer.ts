/**
 * Pure transformer feeding `/fr/regards/colonisation-et-resistances`
 * (Epic 13, Story 13.9, ETNI-533). Carte vivante pattern: never queries
 * Supabase, never throws on missing/malformed input, and omits a section
 * (returns `null`) rather than rendering an empty shell when its data is
 * absent — per-component ad-hoc mapping is not allowed (AC3).
 *
 * `mapSection` / `imposedNames` / `displacement` / `resistances` have no
 * wired data source yet (Stories 13.8/13.10/13.11/13.12 are unlanded
 * dependencies of this story) and stay structurally `null` until those
 * stories land and extend this transformer's input.
 */

import type { DoctrineSlug } from "@/components/source-transparency/DoctrineLinkCard";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";

export interface RawColonizationModuleData {
  fragmentations: PeopleFragmentation[];
}

export interface ColonizationDoctrineIntro {
  slug: DoctrineSlug;
}

export interface ColonizationFragmentationEntry {
  peopleId: string;
  fragmentation: PeopleFragmentation;
}

export interface ColonizationSourceEntry {
  peopleId: string;
  countryIso3: string;
  assertionId: string;
}

export interface ColonizationModuleData {
  doctrine: ColonizationDoctrineIntro;
  fragmentation: ColonizationFragmentationEntry[] | null;
  mapSection: null;
  imposedNames: null;
  displacement: null;
  resistances: null;
  sources: ColonizationSourceEntry[] | null;
}

function isFragmented(
  fragmentation: PeopleFragmentation | null | undefined
): fragmentation is PeopleFragmentation {
  return Boolean(
    fragmentation &&
    fragmentation.countryCount >= 2 &&
    Array.isArray(fragmentation.countries) &&
    fragmentation.countries.length >= 2
  );
}

function toSourceEntries(
  fragmentation: PeopleFragmentation
): ColonizationSourceEntry[] {
  return fragmentation.countries
    .filter((country) => Boolean(country.assertionId))
    .map((country) => ({
      peopleId: fragmentation.peopleId,
      countryIso3: country.iso3,
      assertionId: country.assertionId as string,
    }));
}

// @req FR90
export function transformColonizationModuleData(
  raw: RawColonizationModuleData | null | undefined
): ColonizationModuleData {
  const fragmentations = Array.isArray(raw?.fragmentations)
    ? raw.fragmentations.filter(isFragmented)
    : [];

  const fragmentationEntries: ColonizationFragmentationEntry[] =
    fragmentations.map((fragmentation) => ({
      peopleId: fragmentation.peopleId,
      fragmentation,
    }));

  const sources = fragmentations.flatMap(toSourceEntries);

  return {
    doctrine: { slug: "heritage-colonial" },
    fragmentation:
      fragmentationEntries.length > 0 ? fragmentationEntries : null,
    mapSection: null,
    imposedNames: null,
    displacement: null,
    resistances: null,
    sources: sources.length > 0 ? sources : null,
  };
}

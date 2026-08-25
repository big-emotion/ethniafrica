/**
 * Fragmentation service (Epic 13, FR85) — derives a people's colonial-border
 * fragmentation from data already in production: `afrik_peoples.content ->
 * demography.distributionByCountry` for shares, `afrik_countries` for names.
 *
 * `colonialOrigin` on border pairs is never populated here: the
 * colonial-borders dataset (Story 13.3) does not exist yet in this repo.
 * NFR31 — the field stays additive/optional until 13.3 lands.
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import type {
  BorderPair,
  FragmentationCountry,
  PeopleFragmentation,
} from "@/api/v2/schemas/peopleFragmentation";

export class PeopleFragmentationNotFoundError extends Error {
  constructor(peopleId: string) {
    super(`People not found: ${peopleId}`);
    this.name = "PeopleFragmentationNotFoundError";
  }
}

export class InsufficientCountriesError extends Error {
  constructor(public readonly countryCount: number) {
    super(
      `Fragmentation undefined: people spans ${countryCount} countr${
        countryCount === 1 ? "y" : "ies"
      } (>= 2 required)`
    );
    this.name = "InsufficientCountriesError";
  }
}

interface DistributionEntry {
  country?: string;
  population?: number;
  percentage?: number;
}

function computePopulationShare(
  entry: DistributionEntry,
  allEntries: DistributionEntry[]
): number {
  if (typeof entry.percentage === "number") {
    return entry.percentage / 100;
  }
  const totalPopulation = allEntries.reduce(
    (sum, e) => sum + (typeof e.population === "number" ? e.population : 0),
    0
  );
  if (totalPopulation <= 0 || typeof entry.population !== "number") {
    return 0;
  }
  return entry.population / totalPopulation;
}

/**
 * assertions.value is JSONB holding the asserted distributionByCountry entry
 * (e.g. `{ country, population, percentage }`); matching is done on
 * `value.country` rather than array index so lookups stay correct regardless
 * of ordering. Bulk-migrated fiches predate the contribution/revision
 * workflow and may have no matching assertion yet — that is expected, not
 * an error.
 */
async function getAssertionIdsByCountry(
  supabase: ReturnType<typeof createServerClient>,
  peopleId: string,
  countryIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (countryIds.length === 0) return map;

  const { data, error } = await supabase
    .from("assertions")
    .select("id, value")
    .eq("entity_type", "people")
    .eq("entity_id", peopleId)
    .like("field_path", "content.demography.distributionByCountry%");

  if (error) {
    logger.error("peopleFragmentation.getAssertionIdsByCountry failed", error, {
      peopleId,
    });
    return map;
  }

  for (const row of (data ?? []) as Array<{
    id: string;
    value: unknown;
  }>) {
    const value = row.value as { country?: string } | null;
    const country = value?.country;
    if (country && countryIds.includes(country) && !map.has(country)) {
      map.set(country, row.id);
    }
  }
  return map;
}

async function getCountryNames(
  supabase: ReturnType<typeof createServerClient>,
  countryIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (countryIds.length === 0) return map;

  const { data, error } = await supabase
    .from("afrik_countries")
    .select("id, name_fr")
    .in("id", countryIds);

  if (error) {
    throw new Error(`Failed to load countries: ${error.message}`);
  }

  for (const row of (data ?? []) as Array<{ id: string; name_fr: string }>) {
    map.set(row.id, row.name_fr);
  }
  return map;
}

function buildBorderPairs(countryIds: string[]): BorderPair[] {
  const pairs: BorderPair[] = [];
  for (let i = 0; i < countryIds.length; i++) {
    for (let j = i + 1; j < countryIds.length; j++) {
      // colonialOrigin intentionally omitted: 13.3 dataset does not exist yet.
      pairs.push({ a: countryIds[i], b: countryIds[j] });
    }
  }
  return pairs;
}

export async function getPeopleFragmentation(
  peopleId: string
): Promise<PeopleFragmentation> {
  const supabase = createServerClient();

  const { data: peopleRow, error: peopleError } = await supabase
    .from("afrik_peoples")
    .select("id, content")
    .eq("id", peopleId)
    .maybeSingle();

  if (peopleError) {
    throw new Error(
      `Failed to load people ${peopleId}: ${peopleError.message}`
    );
  }
  if (!peopleRow) {
    throw new PeopleFragmentationNotFoundError(peopleId);
  }

  const content = ((peopleRow as { content?: unknown }).content ??
    {}) as Record<string, unknown>;
  const appellations = (content.appellations ?? {}) as {
    selfAppellation?: string;
    exonyms?: string[];
  };
  const demography = (content.demography ?? {}) as {
    distributionByCountry?: DistributionEntry[];
  };
  const distribution = demography.distributionByCountry ?? [];

  const countryIds = Array.from(
    new Set(
      distribution
        .map((entry) => entry.country)
        .filter((country): country is string => Boolean(country))
    )
  );

  if (countryIds.length < 2) {
    throw new InsufficientCountriesError(countryIds.length);
  }

  const [nameByCountry, assertionIdByCountry] = await Promise.all([
    getCountryNames(supabase, countryIds),
    getAssertionIdsByCountry(supabase, peopleId, countryIds),
  ]);

  const countries: FragmentationCountry[] = countryIds.map((iso3) => {
    const entry = distribution.find((e) => e.country === iso3) ?? {};
    return {
      iso3,
      nameFr: nameByCountry.get(iso3) ?? iso3,
      populationShare: computePopulationShare(entry, distribution),
      assertionId: assertionIdByCountry.get(iso3) ?? null,
    };
  });

  return {
    peopleId,
    autonym: appellations.selfAppellation ?? null,
    exonym: appellations.exonyms?.[0] ?? null,
    countryCount: countryIds.length,
    countries,
    borderPairs: buildBorderPairs(countryIds),
  };
}

const DEFAULT_FRAGMENTATION_INDEX_LIMIT = 50;

/**
 * Bulk read backing the `/fr/regards/colonisation-et-resistances`
 * fragmentation-index section (Epic 13, Story 13.9, FR90). Sweeps a bounded
 * batch of candidate peoples and reuses `getPeopleFragmentation` per id,
 * silently dropping anyone below the 2-country threshold — that is an
 * expected outcome (most peoples aren't fragmented), not an error.
 */
export async function listPeopleFragmentations(
  limit: number = DEFAULT_FRAGMENTATION_INDEX_LIMIT
): Promise<PeopleFragmentation[]> {
  const supabase = createServerClient();

  const { data: candidates, error } = await supabase
    .from("afrik_peoples")
    .select("id")
    .limit(limit);

  if (error || !candidates) {
    logger.error("peopleFragmentation.listPeopleFragmentations failed", error, {
      limit,
    });
    return [];
  }

  const results = await Promise.all(
    (candidates as Array<{ id: string }>).map(async (candidate) => {
      try {
        return await getPeopleFragmentation(candidate.id);
      } catch (err) {
        if (
          err instanceof PeopleFragmentationNotFoundError ||
          err instanceof InsufficientCountriesError
        ) {
          return null;
        }
        throw err;
      }
    })
  );

  return results.filter(
    (fragmentation): fragmentation is PeopleFragmentation =>
      fragmentation !== null
  );
}

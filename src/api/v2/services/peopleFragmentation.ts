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

// @req REQ-091
export class PeopleFragmentationNotFoundError extends Error {
  constructor(peopleId: string) {
    super(`People not found: ${peopleId}`);
    this.name = "PeopleFragmentationNotFoundError";
  }
}

// @req REQ-091
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
 * How many people ids one `.in()` filter carries. PostgREST spends the
 * filter in the query string, so the real ceiling is URL length rather than
 * a row count: ~14 characters per PPL id means a few hundred ids is already
 * a multi-kilobyte URL, and the request fails as a whole rather than
 * returning short.
 */
const ASSERTION_PEOPLE_CHUNK = 100;

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < values.length; start += size) {
    chunks.push(values.slice(start, start + size));
  }
  return chunks;
}

/**
 * The assertion backing each country of a people's distribution, keyed
 * people → country → assertion id.
 *
 * The country is read from `statement`, which for
 * `content.demography.distributionByCountry` holds the ISO 3166-1 alpha-3
 * code and nothing else (789 rows on recette, all of them three letters).
 * This used to read a JSONB `value` column and match `value.country`, which
 * migration `015_module_zero_fabric_align.sql` dropped: PostgREST answered
 * `42703 column assertions.value does not exist`, the error was logged, an
 * empty map came back, and every `assertionId` in the payload was `null` —
 * a broken join that looked exactly like an unsourced corpus.
 *
 * Bulk-migrated fiches predate the contribution/revision workflow and may
 * carry no assertion at all; that absence is expected, and stays `null`.
 *
 * Keyed by people as well as country because the index reads a batch: one
 * query covers every people on the page, where a per-people query was one
 * round trip per row.
 */
async function getAssertionIdsByPeople(
  supabase: ReturnType<typeof createServerClient>,
  peopleIds: string[]
): Promise<Map<string, Map<string, string>>> {
  const byPeople = new Map<string, Map<string, string>>();
  if (peopleIds.length === 0) return byPeople;

  for (const batch of chunk(peopleIds, ASSERTION_PEOPLE_CHUNK)) {
    const { data, error } = await supabase
      .from("assertions")
      .select("id, entity_id, statement")
      .eq("entity_type", "people")
      .in("entity_id", batch)
      .like("field_path", "content.demography.distributionByCountry%");

    if (error) {
      logger.error(
        "peopleFragmentation.getAssertionIdsByPeople failed",
        error,
        { peopleCount: batch.length }
      );
      continue;
    }

    for (const row of (data ?? []) as Array<{
      id: string;
      entity_id: string;
      statement: string | null;
    }>) {
      const country = row.statement?.trim();
      if (!country) continue;
      const forPeople =
        byPeople.get(row.entity_id) ?? new Map<string, string>();
      if (!forPeople.has(country)) forPeople.set(country, row.id);
      byPeople.set(row.entity_id, forPeople);
    }
  }

  return byPeople;
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

/** The countries a distribution names, deduplicated, in fiche order. */
function distinctCountryIds(distribution: DistributionEntry[]): string[] {
  return Array.from(
    new Set(
      distribution
        .map((entry) => entry.country)
        .filter((country): country is string => Boolean(country))
    )
  );
}

interface PeopleAppellations {
  selfAppellation?: string;
  exonyms?: string[];
}

/**
 * The single place a PeopleFragmentation takes its shape. Both readers build
 * it from the same three lookups — the fiche's own distribution, country
 * names, assertion ids — and only differ in how many peoples they resolved
 * those lookups for at once.
 */
function buildFragmentation(
  peopleId: string,
  appellations: PeopleAppellations,
  distribution: DistributionEntry[],
  countryIds: string[],
  nameByCountry: Map<string, string>,
  assertionIdByCountry: Map<string, string>
): PeopleFragmentation {
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

// @req REQ-091
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

  const countryIds = distinctCountryIds(distribution);

  if (countryIds.length < 2) {
    throw new InsufficientCountriesError(countryIds.length);
  }

  const [nameByCountry, assertionIdsByPeople] = await Promise.all([
    getCountryNames(supabase, countryIds),
    getAssertionIdsByPeople(supabase, [peopleId]),
  ]);

  return buildFragmentation(
    peopleId,
    appellations,
    distribution,
    countryIds,
    nameByCountry,
    assertionIdsByPeople.get(peopleId) ?? new Map()
  );
}

/** How many fragmented peoples the index section returns. */
const DEFAULT_FRAGMENTATION_INDEX_LIMIT = 50;

/**
 * Rows per sweep page. Under PostgREST's 1000-row ceiling on purpose: an
 * unranged select is capped server-side without saying so, and a short page
 * is how this walk knows it has reached the end.
 *
 * Exported so the suite can serve a full page and prove the walk asks for a
 * second one — a test that pages at its own chosen size proves nothing about
 * the size the service actually uses.
 */
// @req REQ-091
export const CANDIDATE_PAGE_SIZE = 500;

/**
 * 803 peoples today. Hitting this bound means the server is ignoring
 * `.range()`, and a walk against such a server never terminates.
 */
const CANDIDATE_MAX_PAGES = 20;

/**
 * Only the two subtrees fragmentation reads, never the whole fiche: `content`
 * is a full editorial record, and 803 of them is megabytes fetched to answer
 * a question about country counts.
 */
const CANDIDATE_SELECT =
  "id, appellations:content->appellations, distribution:content->demography->distributionByCountry";

interface FragmentationCandidate {
  id: string;
  appellations: PeopleAppellations | null;
  distribution: DistributionEntry[] | null;
}

/** Every people in the corpus, or null when the sweep could not complete. */
async function sweepCandidates(
  supabase: ReturnType<typeof createServerClient>
): Promise<FragmentationCandidate[] | null> {
  const candidates: FragmentationCandidate[] = [];

  for (let page = 0; page < CANDIDATE_MAX_PAGES; page++) {
    const start = page * CANDIDATE_PAGE_SIZE;
    const { data, error } = await supabase
      .from("afrik_peoples")
      .select(CANDIDATE_SELECT)
      .order("id", { ascending: true })
      .range(start, start + CANDIDATE_PAGE_SIZE - 1);

    if (error || !data) {
      logger.error("peopleFragmentation.sweepCandidates failed", error, {
        page,
      });
      return null;
    }

    const rows = data as unknown as FragmentationCandidate[];
    candidates.push(...rows);
    if (rows.length < CANDIDATE_PAGE_SIZE) return candidates;
  }

  logger.error(
    `peopleFragmentation.sweepCandidates exceeded ${CANDIDATE_MAX_PAGES} pages — the index is truncated`
  );
  return candidates;
}

/**
 * Bulk read backing the `/fr/regards/colonisation-et-resistances`
 * fragmentation-index section (Epic 13, Story 13.9, FR90).
 *
 * It used to take an unordered `limit 50` off `afrik_peoples` and call
 * `getPeopleFragmentation` on each, which cost three round trips per
 * candidate — ~150 uncached queries per render — and, because roughly half
 * the corpus spans a single country, returned whichever ~19 of the 395
 * fragmented peoples happened to sit in the 50 rows Postgres handed back.
 * The section was a different arbitrary sample on every deploy.
 *
 * So the sweep reads the whole corpus once, ranks it, and resolves country
 * names and assertion ids for the page in one query each: three round trips
 * in total, and a page that is the same on two machines.
 *
 * `limit` now counts *fragmentations returned* rather than rows scanned,
 * which is what the caller was asking for all along.
 */
// @req REQ-091
export async function listPeopleFragmentations(
  limit: number = DEFAULT_FRAGMENTATION_INDEX_LIMIT
): Promise<PeopleFragmentation[]> {
  const supabase = createServerClient();

  const candidates = await sweepCandidates(supabase);
  if (!candidates) return [];

  // Most fragmented first: the section is an index *of* fragmentation, so
  // that is the order it is about. Ties break on id so two renders of the
  // same corpus agree.
  const fragmented = candidates
    .map((candidate) => ({
      candidate,
      countryIds: distinctCountryIds(candidate.distribution ?? []),
    }))
    .filter(({ countryIds }) => countryIds.length >= 2)
    .sort(
      (a, b) =>
        b.countryIds.length - a.countryIds.length ||
        a.candidate.id.localeCompare(b.candidate.id)
    )
    .slice(0, limit);

  if (fragmented.length === 0) return [];

  const [nameByCountry, assertionIdsByPeople] = await Promise.all([
    getCountryNames(
      supabase,
      Array.from(new Set(fragmented.flatMap(({ countryIds }) => countryIds)))
    ),
    getAssertionIdsByPeople(
      supabase,
      fragmented.map(({ candidate }) => candidate.id)
    ),
  ]);

  return fragmented.map(({ candidate, countryIds }) =>
    buildFragmentation(
      candidate.id,
      candidate.appellations ?? {},
      candidate.distribution ?? [],
      countryIds,
      nameByCountry,
      assertionIdsByPeople.get(candidate.id) ?? new Map()
    )
  );
}

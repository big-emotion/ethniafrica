/**
 * Games service — the only layer that talks to Supabase for the three games
 * of the Jouer hub (REQ-120). camelCase mapping happens here; the handler and
 * the page never see snake_case, matching migrations.ts.
 *
 * Each game declares which corpus slice it reads, so a round of « Le pays
 * d'avant » never pays for the peoples table. Every query is batched — the
 * corpus is small (789 peoples, 54 countries, 24 families) but an N+1 here
 * would be one per round.
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import { getConfidenceMap } from "@/lib/supabase/queries/afrik/module-zero-batch";
import { ficheSourceEntries } from "@/lib/afrik/ficheSourceLabel";
import type { CountryId } from "@/types/afrik";
import type { GameDataSource } from "@/lib/games/gameRegistry";
import type {
  GameConfidence,
  GameCorpus,
  GameCountryFixture,
  GameCountryShare,
  GameFamilyFixture,
  GameHistoricalNames,
  GameKingdom,
  GamePeopleFixture,
  GameScope,
} from "@/lib/games/corpus";

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Peoples pulled for a round pool. Wide enough to give a round its verbatim
 * options many times over, small enough that the JSONB
 * `content` payload stays a single modest response.
 */
const PEOPLE_POOL_SIZE = 150;

/**
 * The two codes that mean "the table is not deployed yet", the one case where
 * degrading to an empty pool is legitimate. Any other error is a real failure
 * and must not be laundered into "the corpus is empty" — the same distinction
 * migrations.ts draws.
 */
function isSchemaUnavailable(error: { code?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}

/** An unreadable corpus is reported, never silently rendered as an empty game. */
// @req REQ-120
export class GameCorpusUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameCorpusUnavailableError";
  }
}

interface PeopleRow {
  id: string;
  name_main: string;
  language_family_id: string | null;
  content: Record<string, unknown> | null;
}

interface CountryRow {
  id: string;
  name_fr: string;
  etymology: string | null;
  name_origin_actor: string | null;
  content: Record<string, unknown> | null;
}

interface FamilyRow {
  id: string;
  name_fr: string;
}

function section(
  content: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  const value = content?.[key];
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapDistribution(value: unknown): GameCountryShare[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const country = asString(record.country);
    if (!country) return [];
    return [{ country, population: asNumber(record.population) }];
  });
}

function mapKingdoms(value: unknown): GameKingdom[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const name = asString(record.name);
    const historicalRole = asString(record.historicalRole);
    // A kingdom with no name or no stated role cannot carry an honest round:
    // the prompt and the reveal are both drawn from those two fields.
    if (!name || !historicalRole) return [];
    return [
      {
        name,
        period: asString(record.period) ?? "",
        dominantPeoples: asStringArray(record.dominantPeoples),
        politicalCenters: asStringArray(record.politicalCenters),
        historicalRole,
      },
    ];
  });
}

function mapHistoricalNames(value: unknown): GameHistoricalNames | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const names: GameHistoricalNames = {};
  for (const key of [
    "antiquity",
    "middleAges",
    "precolonial",
    "colonization",
    "contemporary",
  ] as const) {
    const text = asString(record[key]);
    if (text) names[key] = text;
  }
  return Object.keys(names).length > 0 ? names : null;
}

/**
 * Countries a people currently spans, from the join table. This follows the
 * fiche's top-level `currentCountries`, which is what the loader writes and
 * what diverges from `content.appellations.currentCountries` in 28 fiches.
 */
async function getCurrentCountriesMap(
  supabase: SupabaseClient,
  peopleIds: string[]
): Promise<Map<string, CountryId[]>> {
  const map = new Map<string, CountryId[]>();
  if (peopleIds.length === 0) return map;

  const { data, error } = await supabase
    .from("afrik_people_countries")
    .select("people_id, country_id")
    .in("people_id", peopleIds);

  if (error) {
    logger.error("Games: people-countries batch failed", error);
    return map;
  }

  for (const row of data ?? []) {
    const existing = map.get(row.people_id) ?? [];
    existing.push(row.country_id);
    map.set(row.people_id, existing);
  }
  return map;
}

/**
 * Recorded confidence for the round subjects, one batched read.
 *
 * A subject with no row gets no entry, and the reveal shows no figure rather
 * than a zero: a made-up percentage would be a statement about how well
 * sourced a people is, made by nobody. The source standings stay visible
 * either way, which is the part the tier policy actually requires.
 */
async function loadConfidence(
  entityIds: string[],
  entityType: "people" | "country"
): Promise<Map<string, GameConfidence>> {
  const scores = await getConfidenceMap(entityIds, entityType);
  const confidence = new Map<string, GameConfidence>();
  for (const [entityId, score] of scores) {
    if (score.sourceCount === null) continue;
    confidence.set(entityId, {
      score: score.score,
      sourceCount: score.sourceCount,
      lastHumanAuditAt: score.lastHumanAuditAt,
    });
  }
  return confidence;
}

/**
 * Ids of the peoples the corpus records in one country.
 *
 * Resolved here rather than by filtering the loaded page: `loadPeoples` reads
 * the first `PEOPLE_POOL_SIZE` ids out of ~890, so narrowing afterwards would
 * answer "which of these 150 are Ghanaian" instead of "which peoples are
 * Ghanaian", and a country whose peoples all sort late would come back empty
 * while the corpus holds plenty.
 */
async function peopleIdsInCountry(
  supabase: SupabaseClient,
  countryId: CountryId
): Promise<string[]> {
  const { data, error } = await supabase
    .from("afrik_people_countries")
    .select("people_id")
    .eq("country_id", countryId);

  if (error) {
    logger.error("Games: country scope lookup failed", error);
    return [];
  }
  return (data ?? []).map((row) => row.people_id as string);
}

async function loadPeoples(
  supabase: SupabaseClient,
  scope?: GameScope
): Promise<GamePeopleFixture[]> {
  let scopedIds: string[] | null = null;
  if (scope?.countryId) {
    scopedIds = await peopleIdsInCountry(supabase, scope.countryId);
    // A country the corpus records no people in yields no session. Falling
    // through to the unscoped query would serve the whole continent under
    // that country's name.
    if (scopedIds.length === 0) return [];
  }

  let peoplesQuery = supabase
    .from("afrik_peoples")
    .select("id, name_main, language_family_id, content");
  if (scope?.familyId) {
    peoplesQuery = peoplesQuery.eq("language_family_id", scope.familyId);
  }
  if (scopedIds) {
    peoplesQuery = peoplesQuery.in("id", scopedIds);
  }

  const { data, error } = await peoplesQuery
    .order("id")
    .limit(PEOPLE_POOL_SIZE);

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw new GameCorpusUnavailableError(
      `Peoples unavailable for a game round: ${error.message}`
    );
  }

  const rows = (data ?? []) as PeopleRow[];
  const familyNames = await loadFamilyNames(supabase);
  const countriesByPeople = await getCurrentCountriesMap(
    supabase,
    rows.map((row) => row.id)
  );
  const confidenceByEntity = await loadConfidence(
    rows.map((row) => row.id),
    "people"
  );

  return rows.map((row) => {
    const appellations = section(row.content, "appellations");
    const demography = section(row.content, "demography");
    const selfAppellation = asString(appellations?.selfAppellation);

    return {
      id: row.id,
      nameMain: row.name_main,
      // The autonym is what the people calls itself; the exonym is the
      // heading a reader arrives with. Falling back to name_main keeps the
      // pair well-formed when a fiche declares no self-appellation.
      name: {
        autonym: selfAppellation ?? row.name_main,
        exonym: row.name_main,
      },
      selfAppellation,
      exonyms: asStringArray(appellations?.exonyms),
      originOfExonyms: asString(appellations?.originOfExonyms),
      currentCountries: countriesByPeople.get(row.id) ?? [],
      totalPopulation: asNumber(demography?.totalPopulation),
      distributionByCountry: mapDistribution(demography?.distributionByCountry),
      languageFamilyId: row.language_family_id,
      languageFamilyNameFr: row.language_family_id
        ? (familyNames.get(row.language_family_id) ?? null)
        : null,
      sources: ficheSourceEntries(
        row.content?.sources as Parameters<typeof ficheSourceEntries>[0]
      ),
      confidence: confidenceByEntity.get(row.id) ?? null,
    };
  });
}

async function loadFamilyNames(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const families = await loadFamilies(supabase);
  return new Map(families.map((family) => [family.id, family.nameFr]));
}

async function loadFamilies(
  supabase: SupabaseClient
): Promise<GameFamilyFixture[]> {
  const { data, error } = await supabase
    .from("afrik_language_families")
    .select("id, name_fr")
    .order("id");

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw new GameCorpusUnavailableError(
      `Language families unavailable for a game round: ${error.message}`
    );
  }

  return ((data ?? []) as FamilyRow[]).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
  }));
}

async function loadCountries(
  supabase: SupabaseClient
): Promise<GameCountryFixture[]> {
  const { data, error } = await supabase
    .from("afrik_countries")
    // etymology and name_origin_actor are top-level columns, not content keys.
    .select("id, name_fr, etymology, name_origin_actor, content")
    .order("id");

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw new GameCorpusUnavailableError(
      `Countries unavailable for a game round: ${error.message}`
    );
  }

  const rows = (data ?? []) as CountryRow[];
  const confidenceByEntity = await loadConfidence(
    rows.map((row) => row.id),
    "country"
  );

  return rows.map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    etymology: row.etymology,
    nameOriginActor: row.name_origin_actor,
    historicalNames: mapHistoricalNames(row.content?.historicalNames),
    kingdoms: mapKingdoms(row.content?.kingdoms),
    sources: ficheSourceEntries(
      row.content?.sources as Parameters<typeof ficheSourceEntries>[0]
    ),
    confidence: confidenceByEntity.get(row.id) ?? null,
  }));
}

/**
 * Loads only the slice a game reads, plus the peoples pool and country
 * names the peoples games need for their verbatim options.
 *
 * `scope` narrows the peoples pool only. The family and country lists come
 * back whole whatever the scope, because they are also the vocabulary the
 * scope picker offers — shrinking them to the current scope would let a
 * reader narrow once and never get back out.
 */
// @req REQ-120
export async function loadGameCorpus(
  dataSource: GameDataSource,
  scope?: GameScope
): Promise<GameCorpus> {
  const supabase = createServerClient();
  const empty: GameCorpus = {
    peoples: [],
    countries: [],
    families: [],
    relations: [],
    migrations: [],
  };

  switch (dataSource) {
    case "peoples":
      // Countries come along for their names alone: two peoples games reveal
      // which countries a people spans, and an ISO code is not an answer a
      // reader can read.
      return {
        ...empty,
        peoples: await loadPeoples(supabase, scope),
        families: await loadFamilies(supabase),
        countries: await loadCountries(supabase),
      };
    case "countries":
      return { ...empty, countries: await loadCountries(supabase) };
    default:
      return empty;
  }
}

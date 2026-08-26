/**
 * Games service — the only layer that talks to Supabase for the eleven games
 * of the Jouer hub (REQ-120). camelCase mapping happens here; the handler and
 * the page never see snake_case, matching migrations.ts.
 *
 * Each game declares which corpus slice it reads, so a round of « Royaumes
 * perdus » never pays for the peoples table. Every query is batched — the
 * corpus is small (789 peoples, 54 countries, 24 families, 12 relations,
 * 6 migrations) but an N+1 here would be one per round.
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import type { CountryId } from "@/types/afrik";
import type { MigrationGeometry } from "@/types/migrations";
import type { RelationType } from "@/types/relations";
import type { GameDataSource } from "@/lib/games/gameRegistry";
import type {
  GameCorpus,
  GameCountryFixture,
  GameCountryShare,
  GameFamilyFixture,
  GameHistoricalNames,
  GameKingdom,
  GameMigrationFixture,
  GamePeopleFixture,
  GameRelationFixture,
} from "@/lib/games/corpus";

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Peoples pulled for a round pool. Wide enough to give the quad games their
 * three verbatim distractors many times over, small enough that the JSONB
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

interface RelationRow {
  id: string;
  relation_type: RelationType;
  people_id_a: string;
  people_id_b: string;
  description: string;
  period_label: string | null;
}

interface MigrationRow {
  id: string;
  name: string;
  summary: string;
  geometry_geojson: MigrationGeometry | null;
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

async function loadPeoples(
  supabase: SupabaseClient
): Promise<GamePeopleFixture[]> {
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("id, name_main, language_family_id, content")
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

  return ((data ?? []) as CountryRow[]).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    etymology: row.etymology,
    nameOriginActor: row.name_origin_actor,
    historicalNames: mapHistoricalNames(row.content?.historicalNames),
    kingdoms: mapKingdoms(row.content?.kingdoms),
  }));
}

async function loadRelations(
  supabase: SupabaseClient
): Promise<GameRelationFixture[]> {
  const { data, error } = await supabase
    .from("afrik_people_relations")
    .select(
      "id, relation_type, people_id_a, people_id_b, description, period_label"
    )
    .order("id");

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw new GameCorpusUnavailableError(
      `Relations unavailable for a game round: ${error.message}`
    );
  }

  return ((data ?? []) as RelationRow[]).map((row) => ({
    id: row.id,
    relationType: row.relation_type,
    peopleIdA: row.people_id_a,
    peopleIdB: row.people_id_b,
    description: row.description,
    periodLabel: row.period_label,
  }));
}

async function loadMigrations(
  supabase: SupabaseClient
): Promise<GameMigrationFixture[]> {
  const { data, error } = await supabase
    .from("migration_events")
    .select("id, name, summary, geometry_geojson")
    .order("id");

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw new GameCorpusUnavailableError(
      `Migration events unavailable for a game round: ${error.message}`
    );
  }

  const rows = (data ?? []) as MigrationRow[];
  if (rows.length === 0) return [];

  // One embedded select for every event's peoples, rather than one per event.
  const { data: links, error: linksError } = await supabase
    .from("migration_event_peoples")
    .select("migration_id, people_id, role, afrik_peoples(id, name_main)")
    .in(
      "migration_id",
      rows.map((row) => row.id)
    );

  if (linksError) {
    logger.error("Games: migration peoples batch failed", linksError);
  }

  const peoplesByMigration = new Map<
    string,
    { id: string; nameMain: string; role: string | null }[]
  >();
  for (const link of (links ?? []) as unknown as {
    migration_id: string;
    people_id: string;
    role: string | null;
    afrik_peoples: { id: string; name_main: string } | null;
  }[]) {
    const existing = peoplesByMigration.get(link.migration_id) ?? [];
    existing.push({
      id: link.people_id,
      nameMain: link.afrik_peoples?.name_main ?? link.people_id,
      role: link.role,
    });
    peoplesByMigration.set(link.migration_id, existing);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    summary: row.summary,
    geometry: row.geometry_geojson,
    peoples: peoplesByMigration.get(row.id) ?? [],
  }));
}

/**
 * Loads only the slice a game reads, plus the peoples pool the relation game
 * needs for its verbatim distractors.
 */
// @req REQ-120
export async function loadGameCorpus(
  dataSource: GameDataSource
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
        peoples: await loadPeoples(supabase),
        families: await loadFamilies(supabase),
        countries: await loadCountries(supabase),
      };
    case "countries":
      return { ...empty, countries: await loadCountries(supabase) };
    case "families":
      return {
        ...empty,
        families: await loadFamilies(supabase),
        peoples: await loadPeoples(supabase),
      };
    case "relations":
      // The relation game names both ends of a link, so it needs the peoples
      // pool as well as the twelve stored relations.
      return {
        ...empty,
        relations: await loadRelations(supabase),
        peoples: await loadPeoples(supabase),
      };
    case "migrations":
      return {
        ...empty,
        migrations: await loadMigrations(supabase),
        peoples: await loadPeoples(supabase),
        countries: await loadCountries(supabase),
      };
    default:
      return empty;
  }
}

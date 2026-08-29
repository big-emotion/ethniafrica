/**
 * Games service — the only layer that talks to Supabase for the Jouer hub's
 * game (REQ-120). camelCase mapping happens here; the handler and the page
 * never see snake_case, matching migrations.ts.
 *
 * A game declares which corpus slice it reads, and « La taille qu'on vous a
 * cachée » reads countries alone — so the peoples pool, the family list and
 * the scope narrowing that fed the retired peoples games went with them. They
 * are in git for whoever rebuilds one against the charter.
 */

import { createServerClient } from "@/lib/supabase/server";
import { getConfidenceMap } from "@/lib/supabase/queries/afrik/module-zero-batch";
import { ficheSourceEntries } from "@/lib/afrik/ficheSourceLabel";
import type { GameDataSource } from "@/lib/games/gameRegistry";
import type {
  GameConfidence,
  GameCorpus,
  GameCountryFixture,
  GameHistoricalNames,
  GameKingdom,
} from "@/lib/games/corpus";

type SupabaseClient = ReturnType<typeof createServerClient>;

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

interface CountryRow {
  id: string;
  name_fr: string;
  etymology: string | null;
  name_origin_actor: string | null;
  content: Record<string, unknown> | null;
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
 * Loads the one slice the game reads.
 *
 * `GameCorpus` still declares the other slices so a rebuilt game can fill
 * them again without reshaping the type; nothing loads them today, and an
 * empty array is the honest value for a slice no game asks for.
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
    case "countries":
      return { ...empty, countries: await loadCountries(supabase) };
    default:
      return empty;
  }
}

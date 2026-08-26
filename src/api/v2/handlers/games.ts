/**
 * Games handler — assembles the rounds of one game from the corpus (REQ-120).
 *
 * There is deliberately no `/api/v2/games/*` route: the game page is a server
 * component that awaits this handler directly, the way `/quiz/page.tsx`
 * already awaits `getQuizSegmentsHandler`. That keeps the OpenAPI contract
 * untouched and saves eleven route/spec pairs. A public route can be added
 * later without breaking anything — the omission is a decision, not an
 * oversight.
 *
 * The one rule every assembly obeys: a generator returning `null` means the
 * corpus cannot support an honest round, and that round is dropped rather
 * than padded (FR65/FR66). A game may therefore return fewer rounds than it
 * asked for, and it says so instead of hiding it.
 */

import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import type { GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { loadGameCorpus } from "@/api/v2/services/gamesService";
import type {
  GameCorpus,
  GameCountryFixture,
  GamePeopleFixture,
} from "@/lib/games/corpus";
import { buildAppellationsRound } from "@/lib/games/rounds/appellationsRound";
import { buildBorderCutRound } from "@/lib/games/rounds/borderCutRound";
import { buildFamilyRound } from "@/lib/games/rounds/familyRound";
import { buildHistoricalNameRound } from "@/lib/games/rounds/historicalNameRound";
import { buildKingdomRound } from "@/lib/games/rounds/kingdomRound";
import { buildMagnitudeRound } from "@/lib/games/rounds/magnitudeRound";
import { buildMercatorRound } from "@/lib/games/rounds/mercatorRound";
import { buildMigrationRound } from "@/lib/games/rounds/migrationRound";
import { buildRelationRound } from "@/lib/games/rounds/relationRound";
import { buildSpreadRound } from "@/lib/games/rounds/spreadRound";
import { buildTrueSizeRound } from "@/lib/games/rounds/trueSizeRound";

export interface GameRoundsData {
  rounds: GameRound[];
  /**
   * True when the corpus yielded fewer rounds than the game asks for — the
   * honest state for the twelve-relation and six-migration games, which the
   * score card states outright rather than rendering as an empty screen.
   */
  corpusLimited: boolean;
}

/**
 * Rotates a pool so repeat visits do not replay the same rounds, without
 * introducing RNG into anything testable. The seed comes from the page.
 */
function rotate<T>(items: T[], seed: number): T[] {
  if (items.length === 0) return items;
  const offset = Math.abs(Math.trunc(seed)) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

/** Pairs consecutive entries: [a,b], [c,d], … — each entity used once. */
function pairs<T>(items: T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i + 1 < items.length; i += 2)
    out.push([items[i], items[i + 1]]);
  return out;
}

function countryNameMap(
  countries: GameCountryFixture[]
): Record<string, string> {
  return Object.fromEntries(countries.map((c) => [c.id, c.nameFr]));
}

function peopleNameMap(
  peoples: GamePeopleFixture[]
): Map<string, GamePeopleFixture> {
  return new Map(peoples.map((people) => [people.id, people]));
}

/** Countries the committed admin-0 asset can actually draw. */
function drawableCountryIds(countries: GameCountryFixture[]): string[] {
  return countries.filter((c) => getAdmin0Rings(c.id)).map((c) => c.id);
}

function assembleRounds(
  game: GameDefinition,
  corpus: GameCorpus,
  seed: number
): GameRound[] {
  const limit = game.roundsPerSession;
  const peoples = rotate(corpus.peoples, seed);
  const countries = rotate(corpus.countries, seed);
  const rounds: GameRound[] = [];

  const push = (round: GameRound | null) => {
    if (round && rounds.length < limit) rounds.push(round);
  };

  switch (game.id) {
    case "appellations":
      for (const people of peoples) push(buildAppellationsRound(people));
      break;

    case "plus-ou-moins":
      for (const [a, b] of pairs(peoples)) push(buildMagnitudeRound(a, b));
      break;

    case "mercator":
      for (const [a, b] of pairs(countries)) push(buildMercatorRound(a, b));
      break;

    case "vraie-taille": {
      const comparisons = rotate(Object.entries(WORLD_COMPARE), seed);
      countries.forEach((country, index) => {
        const [id, shape] = comparisons[index % comparisons.length];
        push(
          buildTrueSizeRound(country, {
            id,
            nameFr: shape.nameFr,
            rings: shape.rings.map((ring) =>
              ring.map(([lon, lat]) => ({ lon, lat }))
            ),
          })
        );
      });
      break;
    }

    case "repartition": {
      const names = countryNameMap(corpus.countries);
      for (const people of peoples) push(buildSpreadRound(people, names));
      break;
    }

    case "pays-davant":
      for (const country of countries)
        push(buildHistoricalNameRound(country, countries));
      break;

    case "royaumes":
      for (const country of countries)
        push(buildKingdomRound(country, countries));
      break;

    case "migrations": {
      const byId = peopleNameMap(corpus.peoples);
      const pool = drawableCountryIds(corpus.countries);
      for (const migration of rotate(corpus.migrations, seed))
        push(buildMigrationRound(migration, byId, pool));
      break;
    }

    case "liens": {
      const byId = peopleNameMap(corpus.peoples);
      for (const relation of rotate(corpus.relations, seed))
        push(buildRelationRound(relation, byId, corpus.peoples));
      break;
    }

    case "familles":
      for (const people of peoples)
        push(buildFamilyRound(people, corpus.families));
      break;

    case "frontieres": {
      const names = countryNameMap(corpus.countries);
      for (const people of peoples) push(buildBorderCutRound(people, names));
      break;
    }
  }

  return rounds;
}

// @req REQ-120
export async function getGameRoundsHandler(
  game: GameDefinition,
  seed: number = 0
): Promise<ApiEnvelope<GameRoundsData>> {
  const corpus = await loadGameCorpus(game.dataSource);
  const rounds = assembleRounds(game, corpus, seed);

  return createApiResponse({
    rounds,
    corpusLimited: rounds.length < game.roundsPerSession,
  });
}

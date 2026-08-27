/**
 * Games handler — assembles the rounds of one game from the corpus (REQ-120).
 *
 * There is deliberately no `/api/v2/games/*` route: the game page is a server
 * component that awaits this handler directly, the way `/quiz/page.tsx`
 * already awaits `getQuizSegmentsHandler`. That keeps the OpenAPI contract
 * untouched and saves a route/spec pair per game. A public route can be added
 * later without breaking anything — the omission is a decision, not an
 * oversight.
 *
 * The one rule every assembly obeys: a generator returning `null` means the
 * corpus cannot support an honest round, and that round is dropped rather
 * than padded (FR65/FR66). A game may therefore return fewer rounds than it
 * asked for, and it says so instead of hiding it.
 */

import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { loadGameCorpus } from "@/api/v2/services/gamesService";
import type { GameCorpus, GameCountryFixture } from "@/lib/games/corpus";
import { buildAppellationsRound } from "@/lib/games/rounds/appellationsRound";
import { buildHistoricalNameRound } from "@/lib/games/rounds/historicalNameRound";
import {
  buildMercatorRound,
  mercatorMisleads,
} from "@/lib/games/rounds/mercatorRound";

export interface GameRoundsData {
  rounds: GameRound[];
  /**
   * True when the corpus yielded fewer rounds than the game asks for — the
   * honest state for a game whose corpus runs short, which the score card
   * states outright rather than rendering as an empty screen.
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

/**
 * Pairs where Mercator lies about which country is bigger, each country used
 * at most once.
 *
 * Consecutive pairing cannot express this. Two countries mislead only when
 * they sit at different latitudes, and neighbours in the corpus are usually
 * neighbours on the map — so walking the list two at a time served mostly
 * honest comparisons, in the one game whose entire subject is the lie. Every
 * candidate pair is considered, greedily, so a country left over by one
 * pairing can still be spent on another.
 */
function misleadingPairs(
  countries: GameCountryFixture[]
): [GameCountryFixture, GameCountryFixture][] {
  const out: [GameCountryFixture, GameCountryFixture][] = [];
  const spent = new Set<string>();

  for (let i = 0; i < countries.length; i++) {
    if (spent.has(countries[i].id)) continue;
    for (let j = i + 1; j < countries.length; j++) {
      if (spent.has(countries[j].id)) continue;
      if (!mercatorMisleads(countries[i], countries[j])) continue;
      out.push([countries[i], countries[j]]);
      spent.add(countries[i].id);
      spent.add(countries[j].id);
      break;
    }
  }
  return out;
}

function countryNameMap(
  countries: GameCountryFixture[]
): Record<string, string> {
  return Object.fromEntries(countries.map((c) => [c.id, c.nameFr]));
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
    case "appellations": {
      // Countries travel with the peoples slice for their names alone: the
      // stimulus situates a people by country, and an ISO code situates
      // nobody.
      const names = countryNameMap(corpus.countries);
      for (const people of peoples) push(buildAppellationsRound(people, names));
      break;
    }

    case "mercator":
      // A session that cannot be filled with misleading pairs is served
      // short: padding it with honest comparisons would quietly undo the
      // filter, and corpusLimited already states the shortfall on screen.
      for (const [a, b] of misleadingPairs(countries))
        push(buildMercatorRound(a, b));
      break;

    case "pays-davant":
      for (const country of countries)
        push(buildHistoricalNameRound(country, countries));
      break;
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

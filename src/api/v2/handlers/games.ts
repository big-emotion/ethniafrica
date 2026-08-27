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
import type { DifficultyBand, GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { loadGameCorpus } from "@/api/v2/services/gamesService";
import type {
  GameCorpus,
  GameCountryFixture,
  GameScope,
} from "@/lib/games/corpus";
import { buildAppellationsRound } from "@/lib/games/rounds/appellationsRound";
import { buildHistoricalNameRound } from "@/lib/games/rounds/historicalNameRound";
import {
  buildMercatorRound,
  mercatorMisleads,
  trueAreaKm2,
} from "@/lib/games/rounds/mercatorRound";

/** One narrowing a reader may pick, already resolved to a readable label. */
export interface GameScopeOption {
  id: string;
  labelFr: string;
}

export interface GameScopeChoices {
  countries: GameScopeOption[];
  families: GameScopeOption[];
}

export interface GameRoundsData {
  rounds: GameRound[];
  /**
   * True when the corpus yielded fewer rounds than the game asks for — the
   * honest state for a game whose corpus runs short, which the score card
   * states outright rather than rendering as an empty screen.
   */
  corpusLimited: boolean;
  /** The narrowing actually applied; null when the session spans the corpus. */
  scope: GameScope | null;
  /** What the reader may narrow to; null for a game that cannot be narrowed. */
  scopeChoices: GameScopeChoices | null;
}

/**
 * A blank query string is not a scope. `?pays=` arrives as an empty string
 * from the URL and must read as "no filter", not as a country whose id is
 * nothing — which would return an empty session under a filter nobody set.
 */
function definedScope(requested?: GameScope): GameScope | null {
  const countryId = requested?.countryId?.trim();
  const familyId = requested?.familyId?.trim();
  if (!countryId && !familyId) return null;
  return {
    ...(countryId ? { countryId } : {}),
    ...(familyId ? { familyId } : {}),
  };
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

/**
 * Where the band boundaries fall, as quantiles of the pool ranked by
 * magnitude. The opening rounds come from the top decile, the middle of the
 * session from the upper half, and everything below the median is the tail.
 */
const TOP_DECILE = 0.1;
const UPPER_HALF = 0.5;

function bandAtRank(rank: number, poolSize: number): DifficultyBand {
  const quantile = poolSize <= 1 ? 0 : rank / (poolSize - 1);
  if (quantile <= TOP_DECILE) return 1;
  if (quantile <= UPPER_HALF) return 2;
  return 3;
}

/**
 * Bands a pool by magnitude and hands it back easiest-first.
 *
 * The returned order is sorted on the *band*, not on the magnitude itself, so
 * inside a band the pool keeps the rotation it arrived with — otherwise
 * difficulty ordering would silently undo `rotate` and pin every session to
 * the same opening subject.
 */
function bandedPool<T>(
  pool: T[],
  idOf: (subject: T) => string,
  magnitudeOf: (subject: T) => number
): { ordered: T[]; bandOf: Map<string, DifficultyBand> } {
  const byMagnitude = [...pool].sort((a, b) => magnitudeOf(b) - magnitudeOf(a));
  const bandOf = new Map<string, DifficultyBand>(
    byMagnitude.map((subject, rank) => [
      idOf(subject),
      bandAtRank(rank, byMagnitude.length),
    ])
  );
  const ordered = [...pool].sort(
    (a, b) => bandOf.get(idOf(a)) - bandOf.get(idOf(b))
  );
  return { ordered, bandOf };
}

/**
 * A people's population as a magnitude. A fiche that records none reads as 0
 * and lands in the tail: an unknown figure must not be mistaken for a small
 * one, and it must not reach the opening rounds by arriving first in the
 * corpus either.
 */
function populationOf(people: GameCorpus["peoples"][number]): number {
  return people.totalPopulation ?? 0;
}

function assembleRounds(
  game: GameDefinition,
  corpus: GameCorpus,
  seed: number
): GameRound[] {
  const limit = game.roundsPerSession;
  const rounds: GameRound[] = [];

  const push = (round: GameRound | null, band: DifficultyBand) => {
    if (round && rounds.length < limit)
      rounds.push({ ...round, difficultyBand: band });
  };

  switch (game.id) {
    case "appellations": {
      // Countries travel with the peoples slice for their names alone: the
      // stimulus situates a people by country, and an ISO code situates
      // nobody.
      const names = countryNameMap(corpus.countries);
      const { ordered, bandOf } = bandedPool(
        rotate(corpus.peoples, seed),
        (people) => people.id,
        populationOf
      );
      for (const people of ordered)
        push(buildAppellationsRound(people, names), bandOf.get(people.id));
      break;
    }

    case "mercator": {
      // A session that cannot be filled with misleading pairs is served
      // short: padding it with honest comparisons would quietly undo the
      // filter, and corpusLimited already states the shortfall on screen.
      const { ordered, bandOf } = bandedPool(
        rotate(corpus.countries, seed),
        (country) => country.id,
        trueAreaKm2
      );
      for (const [a, b] of misleadingPairs(ordered)) {
        // A pair is as hard as its least familiar member: a household name
        // set against a country the reader has never met is that second
        // country's round, whatever the first one is.
        const band = Math.max(bandOf.get(a.id), bandOf.get(b.id));
        push(buildMercatorRound(a, b), band as DifficultyBand);
      }
      break;
    }

    case "pays-davant": {
      const { ordered, bandOf } = bandedPool(
        rotate(corpus.countries, seed),
        (country) => country.id,
        trueAreaKm2
      );
      for (const country of ordered)
        push(
          buildHistoricalNameRound(country, ordered),
          bandOf.get(country.id)
        );
      break;
    }
  }

  // Stable, so a band's own order survives. Mercator needs it: a pair takes
  // the band of its harder half, which the pool order alone cannot express.
  return [...rounds].sort((a, b) => a.difficultyBand - b.difficultyBand);
}

// @req REQ-120
export async function getGameRoundsHandler(
  game: GameDefinition,
  seed: number = 0,
  requestedScope?: GameScope
): Promise<ApiEnvelope<GameRoundsData>> {
  // Only the peoples games have a family or a country to be narrowed to.
  // « La taille qu'on vous a cachée » plays over shapes and « le pays d'avant »
  // scoped to one country would be a question with one answer, so offering
  // either the filter would name something the game cannot apply.
  const scopable = game.dataSource === "peoples";
  const scope = scopable ? definedScope(requestedScope) : null;

  const corpus = await loadGameCorpus(game.dataSource, scope ?? undefined);
  const rounds = assembleRounds(game, corpus, seed);

  return createApiResponse({
    rounds,
    corpusLimited: rounds.length < game.roundsPerSession,
    scope,
    scopeChoices: scopable
      ? {
          countries: corpus.countries.map((entry) => ({
            id: entry.id,
            labelFr: entry.nameFr,
          })),
          families: corpus.families.map((entry) => ({
            id: entry.id,
            labelFr: entry.nameFr,
          })),
        }
      : null,
  });
}

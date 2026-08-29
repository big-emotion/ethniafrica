/**
 * Games handler — assembles the rounds of the Jouer hub's game (REQ-120).
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
import type { GameCorpus, GameCountryFixture } from "@/lib/games/corpus";
import {
  buildMercatorRound,
  mercatorMisleads,
  trueAreaKm2,
} from "@/lib/games/rounds/mercatorRound";
import { buildScaleEstimateRounds } from "@/lib/games/rounds/scaleEstimateRound";

export interface GameRoundsData {
  /**
   * Every round the corpus and the outlines can honestly produce, ordered.
   * Longer than one session on purpose: the island cuts a session out of it
   * and advances the cut on each replay, which is what keeps the page's
   * constant seed from serving one fixed session for good.
   */
  rounds: GameRound[];
  /**
   * True when the pool yielded fewer rounds than one session — the honest
   * state for a game whose corpus runs short, which the score card states
   * outright rather than rendering as an empty screen.
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
 * The comparisons of a country against a country.
 *
 * A session that cannot be filled with misleading pairs is served short:
 * padding it with honest comparisons would quietly undo the filter, and
 * `corpusLimited` already states the shortfall on screen.
 */
function binaryRounds(corpus: GameCorpus, seed: number): GameRound[] {
  const { ordered, bandOf } = bandedPool(
    rotate(corpus.countries, seed),
    (country) => country.id,
    trueAreaKm2
  );

  const rounds: GameRound[] = [];
  for (const [a, b] of misleadingPairs(ordered)) {
    const round = buildMercatorRound(a, b);
    if (!round) continue;

    // A pair is as hard as its least familiar member: a household name set
    // against a country the reader has never met is that second country's
    // round, whatever the first one is.
    const band = Math.max(bandOf.get(a.id), bandOf.get(b.id)) as DifficultyBand;
    rounds.push({ ...round, difficultyBand: band });
  }
  return rounds;
}

/**
 * The estimates of Africa against a familiar shape elsewhere.
 *
 * These read no corpus at all — every figure comes from the committed
 * outlines — so the page has something to play even when Supabase hands back
 * nothing. That is deliberate rather than incidental: the claim this game
 * makes is about geometry, and it should not go dark because a database did.
 *
 * Difficulty is the size of the ratio, not the size of the shape. Landing
 * inside a fifth of « fourteen times » is a harder judgement than landing
 * inside a fifth of « three times », and area would have made Western Europe
 * the hardest round for a French reader, which it plainly is not.
 */
function estimateRounds(): GameRound[] {
  const built = buildScaleEstimateRounds();
  const { bandOf } = bandedPool(
    built,
    (round) => round.subjectId,
    (round) => 1 / round.correctValue
  );

  return built.map((round) => ({
    ...round,
    difficultyBand: bandOf.get(round.subjectId),
  }));
}

/** Takes from each list in turn, so neither gesture runs in a block. */
function interleave(left: GameRound[], right: GameRound[]): GameRound[] {
  const merged: GameRound[] = [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (i < left.length) merged.push(left[i]);
    if (i < right.length) merged.push(right[i]);
  }
  return merged;
}

/**
 * The whole ordered pool, not one session's worth.
 *
 * The handler used to cut it to `roundsPerSession` here, which meant the
 * page's constant seed served every visitor the same rounds for good. The
 * pool travels whole instead and the island cuts a session out of it, so a
 * replay can advance to the next window — see `lib/games/session`.
 */
function assembleRounds(
  game: GameDefinition,
  corpus: GameCorpus,
  seed: number
): GameRound[] {
  const binary = binaryRounds(corpus, seed);
  const estimate = estimateRounds();

  // Two rules meet here and neither may be dropped. Charter §4 wants the
  // session ordered by ascending difficulty; a session of eight identical
  // gestures is a worse session than a mixed one. Sorting globally would
  // block the two kinds; interleaving globally would scramble the bands.
  //
  // So the bands are the outer order and the alternation happens inside each
  // one: the reader still meets an easy round before a hard one, and still
  // never taps the same control eight times running.
  const bands: DifficultyBand[] = [1, 2, 3];
  return bands.flatMap((band) =>
    interleave(
      binary.filter((round) => round.difficultyBand === band),
      estimate.filter((round) => round.difficultyBand === band)
    )
  );
}

/**
 * No scope narrowing. It existed for the peoples games, which could be run
 * over one country or one language family; « La taille qu'on vous a cachée »
 * plays over the whole continent's outlines and has nothing to narrow to.
 */
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

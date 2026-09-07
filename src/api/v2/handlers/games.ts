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
import type { GameCorpus } from "@/lib/games/corpus";
import {
  buildMercatorRound,
  mercatorMisleads,
  trueAreaKm2,
} from "@/lib/games/rounds/mercatorRound";
import {
  MINIMUM_INFLATION_RATIO,
  buildInflationRound,
  mercatorInflationOf,
} from "@/lib/games/rounds/inflationRound";
import { buildScaleEstimateRounds } from "@/lib/games/rounds/scaleEstimateRound";
import {
  LIST_OPTION_COUNT,
  buildLargestOfListRound,
  isMercatorTrapFor,
} from "@/lib/games/rounds/largestOfListRound";
import {
  NON_AFRICAN_SILHOUETTES,
  isAfricanTerritory,
  type ComparedTerritory,
} from "@/lib/games/territory";

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
 * How many times the pool is walked, and so how many pairs a territory may
 * appear in.
 *
 * One pass is what the handler used to do, and it caps the bank at half the
 * pool however many pairs the question could offer: the inflation round has
 * 297 candidate pairs across the African outlines and a single pass yielded
 * nine, because every one of them needs one of the dozen countries far enough
 * from the equator and each was spent immediately.
 *
 * Three because a reader who replays twice must not meet a round twice. The
 * island advances a window of eight on each « rejouer », so three passes over
 * both binary questions put the pool comfortably past three windows. It is not
 * larger because the same dozen anchors carry every inflation pair: past three
 * appearances Morocco starts being the answer often enough to be guessable,
 * and a bank grown that way teaches a reflex rather than the rule.
 */
const POOL_PASSES = 3;

/**
 * Pairs a pool off against itself, keeping only the pairs `worthAsking`
 * accepts and never emitting the same pair twice.
 *
 * Consecutive pairing cannot express either question this feeds. Two countries
 * mislead about area, or differ in how much they are inflated, only when they
 * sit at different latitudes — and neighbours in the corpus are usually
 * neighbours on the map, so walking the list two at a time served mostly
 * honest comparisons in the one game whose entire subject is the lie. Every
 * candidate pair is considered, greedily, so a territory left over by one
 * pairing can still be spent on another.
 *
 * Inside one pass a territory is spent once, which is what keeps a run of
 * consecutive rounds from asking about Tunisia four times over.
 */
function pairOff<T extends ComparedTerritory>(
  pool: T[],
  worthAsking: (a: T, b: T) => boolean
): [T, T][] {
  const out: [T, T][] = [];
  const emitted = new Set<string>();

  for (let pass = 0; pass < POOL_PASSES; pass++) {
    // Each pass starts further into the list, so the greedy walk meets a
    // different first partner. Without it every pass is the same pass:
    // greedy pairing over one order is deterministic.
    const ordered = rotate(
      pool,
      Math.floor((pool.length * pass) / POOL_PASSES)
    );
    const spent = new Set<string>();

    for (let i = 0; i < ordered.length; i++) {
      if (spent.has(ordered[i].id)) continue;
      for (let j = i + 1; j < ordered.length; j++) {
        if (spent.has(ordered[j].id)) continue;
        const key = [ordered[i].id, ordered[j].id].sort().join("|");
        if (emitted.has(key)) continue;
        if (!worthAsking(ordered[i], ordered[j])) continue;
        out.push([ordered[i], ordered[j]]);
        emitted.add(key);
        spent.add(ordered[i].id);
        spent.add(ordered[j].id);
        break;
      }
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
 * The comparisons of one territory against another.
 *
 * The pool is the corpus plus the six silhouettes from outside the continent,
 * because the pairs worth asking are mostly not inside Africa. Mercator's
 * factor runs from 1,00 to 1,46 across the African outlines, so an inversion
 * of rank there needs two countries of near-identical area — sixteen pairs
 * clear both filters, and « Groenland ou RDC ? », the comparison this page was
 * built to make, was not among them for want of a second asset.
 *
 * A session that cannot be filled with misleading pairs is served short:
 * padding it with honest comparisons would quietly undo the filter, and
 * `corpusLimited` already states the shortfall on screen.
 */
function comparisonRounds(corpus: GameCorpus, seed: number): GameRound[] {
  const { ordered, bandOf } = bandedPool(
    rotate([...corpus.countries, ...NON_AFRICAN_SILHOUETTES], seed),
    (territory) => territory.id,
    trueAreaKm2
  );

  // At least one half of every pair is African. Two borrowed silhouettes set
  // against each other would be a round about Europe and India on an atlas of
  // African peoples, and an empty corpus is precisely when that happens: the
  // six silhouettes are the only pool left standing.
  const aboutAfrica = (a: ComparedTerritory, b: ComparedTerritory) =>
    (isAfricanTerritory(a) || isAfricanTerritory(b)) && mercatorMisleads(a, b);

  const rounds: GameRound[] = [];
  for (const [a, b] of pairOff(ordered, aboutAfrica)) {
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
 * The rounds about the projection itself: which of two countries it enlarges
 * more.
 *
 * African outlines only — a silhouette from outside the continent would make
 * the answer readable off the option's own shape, which is the eyesight the
 * charter's kill test refuses. See `inflationRound` for the rest of that
 * argument, and for why this question exists at all.
 *
 * Difficulty is the gap between the two factors, not the size of either: 1,46
 * against 1,00 is a judgement a reader can make from where the two countries
 * sit, and 1,33 against 1,10 is one they mostly cannot.
 */
function inflationGap(a: ComparedTerritory, b: ComparedTerritory): number {
  const factorA = mercatorInflationOf(a);
  const factorB = mercatorInflationOf(b);
  return Math.max(factorA, factorB) / Math.min(factorA, factorB);
}

/**
 * The four-way comparisons: one African country against three territories the
 * flat map draws at least as large.
 *
 * The anchor is always African and the candidates come from the whole pool,
 * which is what makes the round hard in the right way — three northern
 * countries against one equatorial one cannot be sorted by « which is not
 * northern », only by how much each is inflated.
 *
 * Candidates are taken in pool order rather than picked by size. Sorting them
 * would put the same three countries against every anchor, because the same
 * dozen far-from-equator territories qualify for most of them; the rotation
 * the pool arrives with is what keeps Norway from being in every list.
 */
function listRounds(corpus: GameCorpus, seed: number): GameRound[] {
  const pool = rotate([...corpus.countries, ...NON_AFRICAN_SILHOUETTES], seed);
  const { bandOf } = bandedPool(pool, (t) => t.id, trueAreaKm2);

  const rounds: GameRound[] = [];
  const anchored = new Set<string>();

  for (const anchor of pool) {
    if (!isAfricanTerritory(anchor)) continue;
    if (anchored.has(anchor.id)) continue;

    const candidates = pool
      .filter(
        (candidate) =>
          candidate.id !== anchor.id && isMercatorTrapFor(anchor, candidate)
      )
      .slice(0, LIST_OPTION_COUNT - 1);

    const round = buildLargestOfListRound(anchor, candidates);
    if (!round) continue;

    anchored.add(anchor.id);
    // As hard as its least familiar member, the same rule the pair uses.
    const band = Math.max(
      ...round.comparedIds.map((id) => bandOf.get(id) ?? 3)
    ) as DifficultyBand;
    rounds.push({ ...round, difficultyBand: band });
  }
  return rounds;
}

function inflationRounds(corpus: GameCorpus, seed: number): GameRound[] {
  const pairs = pairOff(
    rotate(corpus.countries, seed),
    (a, b) => inflationGap(a, b) >= MINIMUM_INFLATION_RATIO
  );

  const built = pairs
    .map(([a, b]) => ({
      round: buildInflationRound(a, b),
      gap: inflationGap(a, b),
    }))
    .filter((entry) => entry.round !== null);

  const { bandOf } = bandedPool(
    built,
    (entry) => entry.round.subjectId,
    (entry) => entry.gap
  );

  return built.map((entry) => ({
    ...entry.round,
    difficultyBand: bandOf.get(entry.round.subjectId),
  }));
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

/**
 * Takes from each list in turn, so no one question runs in a block.
 *
 * Round-robin rather than a proportional draw, and that matters now that the
 * three lists are wildly uneven: the inflation question can offer hundreds of
 * pairs where the comparison offers a dozen and the estimate exactly six. A
 * draw weighted by pool size would hand a session of eight to the largest list
 * and the reader would meet one question all evening. Taking one from each in
 * turn keeps the opening of every session mixed, which is the part anyone
 * plays.
 */
function interleave(lists: GameRound[][]): GameRound[] {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  const merged: GameRound[] = [];

  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      if (i < list.length) merged.push(list[i]);
    }
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
  const byTemplate = [
    comparisonRounds(corpus, seed),
    listRounds(corpus, seed),
    inflationRounds(corpus, seed),
    estimateRounds(),
  ];

  // Two rules meet here and neither may be dropped. Charter §4 wants the
  // session ordered by ascending difficulty; a session of eight identical
  // questions is a worse session than a mixed one. Sorting globally would
  // block the three templates; interleaving globally would scramble the bands.
  //
  // So the bands are the outer order and the alternation happens inside each
  // one: the reader still meets an easy round before a hard one, and still
  // never answers the same question eight times running.
  const bands: DifficultyBand[] = [1, 2, 3];
  return bands.flatMap((band) =>
    interleave(
      byTemplate.map((rounds) =>
        rounds.filter((round) => round.difficultyBand === band)
      )
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

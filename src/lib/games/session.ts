import type { GameRound } from "@/lib/games/gameKinds";

/**
 * Cutting one session out of the round pool (REQ-120).
 *
 * The page's seed is derived from the game's slug, which is a constant, and
 * that is deliberate: a clock read during render is impure and would
 * desynchronise the server tree from the client one, and the route stays
 * cacheable without it. The cost is that every visitor was served the same
 * opening rounds — and, before the pool grew, the same seven rounds for good.
 *
 * The fix belongs on the client rather than in the seed. The pool travels
 * whole, the first session is the deterministic window the server could have
 * predicted, and each replay advances by a full session. Nothing about the
 * first render changes; only a reader who asks for another game gets one.
 */

/**
 * The `index`-th session of `size` rounds, wrapping around the pool.
 *
 * Wrapping rather than stopping: a pool of thirteen and a session of eight
 * has no second full window, and « rejouer » must never hand back a session
 * shorter than the first for want of one.
 */
// @req REQ-120
export function takeSession(
  pool: GameRound[],
  size: number,
  index: number
): GameRound[] {
  if (pool.length === 0 || size <= 0) return [];

  const start = (Math.abs(Math.trunc(index)) * size) % pool.length;
  const wanted = Math.min(size, pool.length);

  return Array.from(
    { length: wanted },
    (_unused, offset) => pool[(start + offset) % pool.length]
  );
}

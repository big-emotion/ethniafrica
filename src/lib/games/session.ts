import type { GameRound } from "@/lib/games/gameKinds";

/**
 * Cutting one session out of the round pool (REQ-120).
 *
 * Two things decide which eight rounds a reader meets, and for a long time
 * only one of them moved. `takeSession` advances a window on replay, so a
 * reader who taps « rejouer » gets the next eight. The seed decides which pool
 * the window is cut from — and the page derived it from the game's slug, which
 * is a constant, so every visitor on every reload was served the same opening
 * session. Replaying was the only way to see a second one, and leaving the
 * page undid it.
 *
 * The comment defending that constant named two costs a moving seed would
 * incur, and neither survives inspection. A clock read in render was said to
 * desynchronise the server tree from the client one: it cannot, because the
 * rounds are built on the server and travel to the island as serialized props,
 * so nothing re-derives them to disagree about. And the route was said to stay
 * cacheable: it never was, the root layout awaiting `connection()` for the CSP
 * nonce making every page under it dynamic.
 *
 * So the seed moves per request, and reproducibility stays where it belongs —
 * it is a parameter, and every test passes its own.
 */

/**
 * A fresh window into the pool, one per request.
 *
 * Named rather than inlined at the one call site because it is a decision, not
 * an expression: the page reads it in render, which is exactly what the
 * constant it replaces was defending against, and the module comment above is
 * the argument for why that defence was unnecessary here.
 */
// @req REQ-120
export function requestSeed(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

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

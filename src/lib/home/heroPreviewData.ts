import { unstable_cache } from "next/cache";

import { getGameRoundsHandler } from "@/api/v2/handlers/games";
import { getGameBySlug, type GameDefinition } from "@/lib/games/gameRegistry";
import type { GameRound } from "@/lib/games/gameKinds";
import { logger } from "@/lib/api/logger";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

/**
 * What the hero slot needs in hand before it can render the drawn module
 * (REQ-115). Everything here crosses the server/client boundary as props,
 * so it stays serialisable — the same contract /fr/jouer/[jeu] already
 * honours when it hands rounds to GamePlayHost.
 */
export type HeroPreview =
  | { kind: "standalone"; moduleId: string }
  | { kind: "game"; game: GameDefinition; rounds: GameRound[] };

/**
 * The seed offsets each game into a different stretch of the corpus pool,
 * derived from the slug rather than a clock — the discipline
 * /fr/jouer/[jeu] set, and the reason the same game always opens on the
 * same round here too. Only *which module* the home draws is random; what
 * that module then shows is not.
 */
function seedFor(slug: string): number {
  return [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

// Rounds are a pure function of (slug, seed), so caching them costs nothing
// in freshness and takes a Supabase round trip off a page that is hit far
// more often than any single game. Same reasoning as the hub's availability
// probe (DEC-018), one tier longer because the corpus moves slower than a
// module's liveness.
const cachedRounds = unstable_cache(
  async (slug: string, seed: number): Promise<GameRound[]> => {
    const game = getGameBySlug(slug);
    if (!game) return [];
    const envelope = await getGameRoundsHandler(game, seed);
    return envelope.data.rounds;
  },
  ["hero-game-rounds"],
  { revalidate: 300 }
);

/**
 * Resolves the drawn module to everything its preview needs.
 *
 * Returns null when the module declares a path it cannot actually take —
 * a game whose slug is not registered, or rounds the corpus could not
 * fill. The caller keeps the globe rather than opening on an empty band,
 * the same way moduleAvailability degrades a failed probe to "unavailable"
 * instead of throwing into the render.
 */
// @req REQ-115
export async function loadHeroPreview(
  module: HubModule
): Promise<HeroPreview | null> {
  if (module.heroable === "standalone") {
    return { kind: "standalone", moduleId: module.id };
  }

  if (module.heroable !== "game" || !module.gameSlug) return null;

  const game = getGameBySlug(module.gameSlug);
  if (!game) {
    logger.error(
      `Hero module ${module.id} declares game slug ${module.gameSlug}, which is not registered`
    );
    return null;
  }

  try {
    const rounds = await cachedRounds(game.slug, seedFor(game.slug));
    if (rounds.length === 0) return null;
    return { kind: "game", game, rounds };
  } catch (error) {
    logger.error(`Hero rounds failed for game ${game.slug}`, error);
    return null;
  }
}

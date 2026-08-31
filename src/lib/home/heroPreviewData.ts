import { unstable_cache } from "next/cache";

import { getGameRoundsHandler } from "@/api/v2/handlers/games";
import {
  listMigrationPaths,
  type MigrationPath,
} from "@/api/v2/services/migrations";
import { getGameBySlug, type GameDefinition } from "@/lib/games/gameRegistry";
import type { GameRound } from "@/lib/games/gameKinds";
import { getLanguageFamilyLabels } from "@/lib/supabase/queries/afrik/languageFamilyLabels";
import { getPeopleCountsByLanguageFamily } from "@/lib/supabase/queries/afrik/peoples";
import { logger } from "@/lib/api/logger";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

/** A family as the crown draws it: a name, and the weight it carries. */
export interface HeroFamilyNode {
  id: string;
  nameFr: string;
  peopleCount: number;
}

/**
 * What the hero slot needs in hand before it can render the drawn module
 * (REQ-115). Everything here crosses the server/client boundary as props,
 * so it stays serialisable — the contract /fr/jouer/[jeu] already honours
 * when it hands rounds to GamePlayHost.
 */
export type HeroPreview =
  | { kind: "globe" }
  | { kind: "game"; game: GameDefinition; rounds: GameRound[] }
  | { kind: "migration-paths"; paths: MigrationPath[] }
  | { kind: "family-crown"; families: HeroFamilyNode[] };

/** How many sourced events the band draws. The corpus holds six. */
const HERO_MIGRATION_LIMIT = 8;

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

// Every loader below is a pure function of its inputs, so caching costs
// nothing in freshness and takes a Supabase round trip off a page hit far
// more often than any single module's own route. Same reasoning as the
// hub's availability probe (DEC-018), one tier longer because the corpus
// moves slower than a module's liveness.
const CACHE_SECONDS = 300;

const cachedRounds = unstable_cache(
  async (slug: string, seed: number): Promise<GameRound[]> => {
    const game = getGameBySlug(slug);
    if (!game) return [];
    const envelope = await getGameRoundsHandler(game, seed);
    return envelope.data.rounds;
  },
  ["hero-game-rounds"],
  { revalidate: CACHE_SECONDS }
);

const cachedPaths = unstable_cache(
  (limit: number) => listMigrationPaths(limit),
  ["hero-migration-paths"],
  { revalidate: CACHE_SECONDS }
);

const cachedFamilies = unstable_cache(
  async (): Promise<HeroFamilyNode[]> => {
    // Two queries, both already narrow: labels selects two columns, the
    // counts query selects one. Neither touches the editorial JSONB, and
    // neither is per-family — a footprint derived family by family would
    // be forty-eight round trips on a home page.
    const [labels, counts] = await Promise.all([
      getLanguageFamilyLabels(),
      getPeopleCountsByLanguageFamily(),
    ]);

    return labels.map((label) => ({
      id: label.id,
      nameFr: label.nameFr,
      peopleCount: counts.get(label.id) ?? 0,
    }));
  },
  ["hero-family-crown"],
  { revalidate: CACHE_SECONDS }
);

/**
 * Resolves the drawn module to everything its preview needs.
 *
 * Returns null when the module declares a shape it cannot actually fill —
 * a game whose slug is not registered, an empty corpus, a failed read. The
 * caller keeps the globe rather than opening on an empty band, the way
 * moduleAvailability degrades a failed probe to "unavailable" instead of
 * throwing into the render.
 */
// @req REQ-115
export async function loadHeroPreview(
  module: HubModule
): Promise<HeroPreview | null> {
  try {
    switch (module.heroable) {
      case "globe":
        return { kind: "globe" };

      case "game": {
        if (!module.gameSlug) return null;
        const game = getGameBySlug(module.gameSlug);
        if (!game) {
          logger.error(
            `Hero module ${module.id} declares game slug ${module.gameSlug}, which is not registered`
          );
          return null;
        }
        const rounds = await cachedRounds(game.slug, seedFor(game.slug));
        return rounds.length > 0 ? { kind: "game", game, rounds } : null;
      }

      case "migration-paths": {
        const paths = await cachedPaths(HERO_MIGRATION_LIMIT);
        return paths.length > 0 ? { kind: "migration-paths", paths } : null;
      }

      case "family-crown": {
        const families = await cachedFamilies();
        return families.length > 0 ? { kind: "family-crown", families } : null;
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error(`Hero preview failed for module ${module.id}`, error);
    return null;
  }
}

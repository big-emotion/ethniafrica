import type { GameKind } from "@/lib/games/gameKinds";

/**
 * The one game under the Jouer hub beside the quiz (REQ-120).
 *
 * The hub's own module list lives in `src/lib/hubs/moduleRegistry.ts` and
 * addresses it by `gameSlug`; this registry is what the game route resolves a
 * slug against. Keeping them apart means `PageType` stays a closed union
 * instead of growing a variant per game.
 *
 * Eleven games shipped first, three survived the charter's scope cut, and the
 * hub is now cut again to two surfaces: the quiz and this one. See
 * `docs/design/games-charter.md` §1 for what went and why. Every retired
 * generator is recoverable from git rather than kept unreachable here.
 */

export type GameId = "mercator";

/**
 * Which corpus slice a game reads — drives what the service must load.
 *
 * Down to `countries` alone: `peoples` went with « Eux, ou les autres ? », the
 * way `families`, `relations` and `migrations` went with the games retired
 * before it. A slice no game declares is a Supabase read the service can never
 * reach.
 */
export type GameDataSource = "countries";

export interface GameDefinition {
  id: GameId;
  /** Slug in /fr/jouer/<slug>; equal to the id for every game today. */
  slug: string;
  nameFr: string;
  /**
   * Every interaction primitive this game can serve, so no renderer ships
   * unexercised — `gameRegistry.test.ts` reads this to assert it. A list
   * rather than one value since « La taille qu'on vous a cachée » asks its
   * question two ways: a choice between two countries, and an estimate of how
   * many times a shape fits in Africa. See `scaleEstimateRound` for why one
   * of them could not carry the lesson alone.
   */
  kinds: GameKind[];
  dataSource: GameDataSource;
  /** The standing question, shown above every round. */
  promptFr: string;
  /** Rounds offered in one session. */
  roundsPerSession: number;
}

// @req REQ-120
export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: "mercator",
    slug: "mercator",
    nameFr: "La taille qu'on vous a cachée",
    kinds: ["binary", "estimate"],
    dataSource: "countries",
    promptFr: "Lequel de ces deux pays couvre la plus grande surface ?",
    roundsPerSession: 8,
  },
];

// @req REQ-120
export const GAME_SLUGS: string[] = GAME_DEFINITIONS.map((game) => game.slug);

// @req REQ-120
export function getGameBySlug(slug: string): GameDefinition | null {
  return GAME_DEFINITIONS.find((game) => game.slug === slug) ?? null;
}

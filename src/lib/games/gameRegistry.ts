import type { GameKind } from "@/lib/games/gameKinds";

/**
 * The three games under the Jouer hub (REQ-120).
 *
 * The hub's own module list lives in `src/lib/hubs/moduleRegistry.ts` and
 * addresses these by `gameSlug`; this registry is what the game route resolves
 * a slug against. Keeping them apart means `PageType` stays a closed union
 * instead of growing a variant per game.
 *
 * Eleven games shipped first and eight were retired: see
 * `docs/design/games-charter.md` §1 for which, and why. Shape-comparison went
 * as a category — answering by eye teaches nothing about names — while the
 * rest are deferred until they are rebuilt against the charter. Their
 * generators are recoverable from git rather than kept unreachable here.
 */

export type GameId = "appellations" | "mercator" | "pays-davant";

/**
 * Which corpus slice a game reads — drives what the service must load.
 *
 * `families`, `relations` and `migrations` went with the games that read
 * them: a slice no game declares is a Supabase read the service can never
 * reach.
 */
export type GameDataSource = "peoples" | "countries";

export interface GameDefinition {
  id: GameId;
  /** Slug in /fr/jouer/<slug>; equal to the id for every game today. */
  slug: string;
  nameFr: string;
  kind: GameKind;
  dataSource: GameDataSource;
  /** The standing question, shown above every round. */
  promptFr: string;
  /**
   * Rounds offered in one session. Two games are capped by the corpus rather
   * than by design — 12 relations and 6 migration events — and say so on
   * screen instead of padding to a round number.
   */
  roundsPerSession: number;
}

// @req REQ-120
export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: "appellations",
    slug: "appellations",
    nameFr: "Eux, ou les autres ?",
    kind: "binary",
    dataSource: "peoples",
    promptFr: "Lequel de ces deux noms le peuple se donne-t-il à lui-même ?",
    roundsPerSession: 8,
  },
  {
    id: "mercator",
    slug: "mercator",
    nameFr: "La taille qu'on vous a cachée",
    kind: "binary",
    dataSource: "countries",
    promptFr: "Lequel de ces deux pays couvre la plus grande surface ?",
    roundsPerSession: 8,
  },
  {
    id: "pays-davant",
    slug: "pays-davant",
    nameFr: "Le pays d'avant",
    kind: "globeTap",
    dataSource: "countries",
    promptFr: "Quel pays porte aujourd'hui ce nom d'avant ?",
    roundsPerSession: 8,
  },
];

// @req REQ-120
export const GAME_SLUGS: string[] = GAME_DEFINITIONS.map((game) => game.slug);

// @req REQ-120
export function getGameBySlug(slug: string): GameDefinition | null {
  return GAME_DEFINITIONS.find((game) => game.slug === slug) ?? null;
}

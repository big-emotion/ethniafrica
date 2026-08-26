import type { GameKind } from "@/lib/games/gameKinds";

/**
 * The eleven games under the Jouer hub (REQ-120).
 *
 * The hub's own module list lives in `src/lib/hubs/moduleRegistry.ts` and
 * addresses these by `gameSlug`; this registry is what the game route resolves
 * a slug against. Keeping them apart means `PageType` stays a closed union
 * instead of growing eleven variants.
 */

export type GameId =
  | "appellations"
  | "plus-ou-moins"
  | "mercator"
  | "vraie-taille"
  | "repartition"
  | "pays-davant"
  | "royaumes"
  | "migrations"
  | "liens"
  | "familles"
  | "frontieres";

/** Which corpus slice a game reads — drives what the service must load. */
export type GameDataSource =
  | "peoples"
  | "countries"
  | "families"
  | "relations"
  | "migrations";

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
    id: "plus-ou-moins",
    slug: "plus-ou-moins",
    nameFr: "Plus ou moins ?",
    kind: "binary",
    dataSource: "peoples",
    promptFr: "Lequel de ces deux peuples est le plus nombreux ?",
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
    id: "vraie-taille",
    slug: "vraie-taille",
    nameFr: "Vraie taille",
    kind: "areaCompare",
    dataSource: "countries",
    promptFr: "Deux formes, à la même échelle. Laquelle est la plus grande ?",
    roundsPerSession: 6,
  },
  {
    id: "repartition",
    slug: "repartition",
    nameFr: "Où vivent-ils ?",
    kind: "areaCompare",
    dataSource: "peoples",
    promptFr:
      "Dans lequel de ces deux pays ce peuple est-il le plus nombreux ?",
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
  {
    id: "royaumes",
    slug: "royaumes",
    nameFr: "Royaumes perdus",
    kind: "globeTap",
    dataSource: "countries",
    promptFr: "Sur quel pays d'aujourd'hui ce royaume s'étendait-il ?",
    roundsPerSession: 8,
  },
  {
    id: "migrations",
    slug: "migrations",
    nameFr: "Le fil des migrations",
    kind: "globeTap",
    dataSource: "migrations",
    promptFr: "Où ce mouvement a-t-il mené ?",
    roundsPerSession: 6,
  },
  {
    id: "liens",
    slug: "liens",
    nameFr: "Les liens invisibles",
    kind: "quad",
    dataSource: "relations",
    promptFr: "Quel peuple ce lien relie-t-il à l'autre ?",
    roundsPerSession: 6,
  },
  {
    id: "familles",
    slug: "familles",
    nameFr: "Range-le dans sa famille",
    kind: "quad",
    dataSource: "peoples",
    promptFr: "À quelle famille linguistique ce peuple appartient-il ?",
    roundsPerSession: 8,
  },
  {
    id: "frontieres",
    slug: "frontieres",
    nameFr: "La ligne qui coupe",
    kind: "quad",
    dataSource: "peoples",
    promptFr: "Entre combien de pays ce peuple est-il aujourd'hui réparti ?",
    roundsPerSession: 8,
  },
];

// @req REQ-120
export const GAME_SLUGS: string[] = GAME_DEFINITIONS.map((game) => game.slug);

// @req REQ-120
export function getGameBySlug(slug: string): GameDefinition | null {
  return GAME_DEFINITIONS.find((game) => game.slug === slug) ?? null;
}

import type { PageType } from "@/lib/routing";

// REQ-114: the three access modes are the three intents a reader arrives
// with, not the three entity types they end up reading. Explorer is for
// someone who already knows what they are after, Comprendre for someone
// asking where a claim comes from, Jouer for someone who wants the corpus
// to answer back. The modules live behind the click.
//
// This restores the verb taxonomy the design charter (atlas-charter.md §3)
// has described all along; the entity-shaped peuples/pays/familles modes
// shipped by ETNI-1216 are folded into Explorer, which is where a reader
// looking for a fiche was always going to land.
export type AccessMode = "explorer" | "comprendre" | "jouer";

// @req REQ-114
export const ACCESS_MODES: AccessMode[] = ["explorer", "comprendre", "jouer"];

// One categorical accent per mode, from the CVD-validated four (color.css
// §"Categorical accents"). Terre stays out: it is the fiche-level accent
// for families, and reusing it for an axis would make the axis and the
// entity read as the same scope.
// @req REQ-114
export const ACCENT_BY_ACCESS_MODE: Record<AccessMode, string> = {
  explorer: "afh-accent-ocre",
  comprendre: "afh-accent-teal",
  jouer: "afh-accent-perv",
};

// The Supabase table whose row count decides whether a "data" module is
// live (REQ-106).
export type ModuleDataSource =
  | "afrik_peoples"
  | "afrik_countries"
  | "afrik_language_families"
  | "name_records"
  | "migration_events"
  | "afrik_people_relations"
  | "quiz_questions";

// - "data": live only once its backing table (dataSource) holds >= 1 row.
// - "static": a page that exists whatever the corpus holds — search,
//   doctrine and about render from code, so probing a table for them would
//   only invent a way for a working route to disappear.
// - "unavailable": never live regardless of data, for a module whose
//   surface isn't wired into any route yet. No module is in that state
//   since REQ-120 gave the Jouer hub its games; the case is kept for the
//   next module announced before its route exists.
export type ModuleAvailability = "data" | "static" | "unavailable";

export interface HubModuleDefinition {
  id: string;
  name: string;
  accessMode: AccessMode;
  page: PageType | null;
  availability: ModuleAvailability;
  dataSource?: ModuleDataSource;
  /** A game under the Jouer hub, addressed as /fr/jouer/<gameSlug> rather than by PageType. Keeps PageType a closed union instead of growing eleven variants. */
  gameSlug?: string;
}

// @req REQ-114
export const MODULE_DEFINITIONS: HubModuleDefinition[] = [
  {
    id: "peuples",
    name: "Les peuples d'Afrique",
    accessMode: "explorer",
    page: "peoples",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "pays",
    name: "Les pays d'Afrique",
    accessMode: "explorer",
    page: "countries",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "familles",
    name: "L'arbre des familles",
    accessMode: "explorer",
    page: "families",
    availability: "data",
    dataSource: "afrik_language_families",
  },
  {
    id: "recherche",
    name: "Recherche libre",
    accessMode: "explorer",
    page: "search",
    availability: "static",
  },
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "explorer",
    page: "names",
    availability: "data",
    dataSource: "name_records",
  },
  {
    id: "doctrine",
    name: "La doctrine éditoriale",
    accessMode: "comprendre",
    page: "doctrine",
    availability: "static",
  },
  {
    id: "about",
    name: "À propos du projet",
    accessMode: "comprendre",
    page: "about",
    availability: "static",
  },
  {
    // Named for what the corpus actually holds — six sourced events, not a
    // three-millennia timeline (ETNI-1198).
    id: "frise",
    name: "Premiers repères de migrations",
    accessMode: "comprendre",
    page: "migrations",
    availability: "data",
    dataSource: "migration_events",
  },
  // Jouer: the quiz keeps its own route; every other entry is a game the
  // hub reaches by slug. comparer and liens keep the ids they shipped with
  // as "Bientôt" placeholders — the surfaces they stood in for now exist,
  // so absorbing them beats leaving two dead entries beside the live ones.
  {
    id: "quiz",
    name: "Le quiz",
    accessMode: "jouer",
    page: "quiz",
    availability: "data",
    dataSource: "quiz_questions",
  },
  {
    id: "appellations",
    name: "Eux, ou les autres ?",
    accessMode: "jouer",
    page: null,
    gameSlug: "appellations",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "plus-ou-moins",
    name: "Plus ou moins ?",
    accessMode: "jouer",
    page: null,
    gameSlug: "plus-ou-moins",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "mercator",
    name: "La taille qu'on vous a cachée",
    accessMode: "jouer",
    page: null,
    gameSlug: "mercator",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "comparer",
    name: "Vraie taille",
    accessMode: "jouer",
    page: null,
    gameSlug: "vraie-taille",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "repartition",
    name: "Où vivent-ils ?",
    accessMode: "jouer",
    page: null,
    gameSlug: "repartition",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "pays-davant",
    name: "Le pays d'avant",
    accessMode: "jouer",
    page: null,
    gameSlug: "pays-davant",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "royaumes",
    name: "Royaumes perdus",
    accessMode: "jouer",
    page: null,
    gameSlug: "royaumes",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "migrations",
    name: "Le fil des migrations",
    accessMode: "jouer",
    page: null,
    gameSlug: "migrations",
    availability: "data",
    dataSource: "migration_events",
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    gameSlug: "liens",
    availability: "data",
    dataSource: "afrik_people_relations",
  },
  {
    // Prefixed because the Explorer atlas already holds the id "familles":
    // module ids key the hub's data-testid, so a collision would let a
    // selector aimed at the atlas match the game instead. The route the
    // reader sees is still /jouer/familles.
    id: "jeu-familles",
    name: "Range-le dans sa famille",
    accessMode: "jouer",
    page: null,
    gameSlug: "familles",
    availability: "data",
    dataSource: "afrik_language_families",
  },
  {
    id: "frontieres",
    name: "La ligne qui coupe",
    accessMode: "jouer",
    page: null,
    gameSlug: "frontieres",
    availability: "data",
    dataSource: "afrik_peoples",
  },
];

// @req REQ-114
export const getModulesForAccessMode = (
  mode: AccessMode
): HubModuleDefinition[] =>
  MODULE_DEFINITIONS.filter((def) => def.accessMode === mode);

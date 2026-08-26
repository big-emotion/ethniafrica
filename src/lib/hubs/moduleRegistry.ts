import type { PageType } from "@/lib/routing";

// REQ-114: the three access modes are the three intents a reader arrives
// with, not the three entity types they end up reading. Explorer is for
// someone who already knows what they are after, Comprendre for someone
// asking where a claim comes from, Jouer for someone who wants the corpus
// to answer back. The ten modules live behind the click.
//
// This restores the verb taxonomy the design charter (atlas-charter.md §3)
// has described all along; the entity-shaped peuples/pays/familles modes
// shipped by ETNI-1216 are folded into Explorer, which is where a reader
// looking for a fiche was always going to land.
export type AccessMode = "explorer" | "comprendre" | "jouer";

export const ACCESS_MODES: AccessMode[] = ["explorer", "comprendre", "jouer"];

// One categorical accent per mode, from the CVD-validated four (color.css
// §"Categorical accents"). Terre stays out: it is the fiche-level accent
// for families, and reusing it for an axis would make the axis and the
// entity read as the same scope.
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
  | "migration_events";

// - "data": live only once its backing table (dataSource) holds >= 1 row.
// - "static": a page that exists whatever the corpus holds — search,
//   doctrine and about render from code, so probing a table for them would
//   only invent a way for a working route to disappear.
// - "unavailable": never live regardless of data — either no route exists
//   yet (liens has no standalone page, only a nested per-people sub-route)
//   or the surface isn't wired into any route (comparer's picker, per
//   ETNI-1189/REQ-106).
export type ModuleAvailability = "data" | "static" | "unavailable";

export interface HubModuleDefinition {
  id: string;
  name: string;
  accessMode: AccessMode;
  page: PageType | null;
  availability: ModuleAvailability;
  dataSource?: ModuleDataSource;
}

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
  {
    id: "comparer",
    name: "Comparer deux peuples",
    accessMode: "jouer",
    page: "compare",
    availability: "unavailable",
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    availability: "unavailable",
  },
];

export const getModulesForAccessMode = (
  mode: AccessMode
): HubModuleDefinition[] =>
  MODULE_DEFINITIONS.filter((def) => def.accessMode === mode);

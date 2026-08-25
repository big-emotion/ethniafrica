import type { PageType } from "@/lib/routing";

export type ModuleCategory = "explorer" | "comprendre" | "jouer";
export type ModuleState = "live" | "soon";
export type ModuleAccent = "ocre" | "teal" | "terre" | "perv";

export interface HomeModule {
  id: string;
  title: string;
  category: ModuleCategory;
  accent: ModuleAccent;
  illustration: string;
  state: ModuleState;
  href: string | null;
}

/**
 * The Supabase table whose row count decides whether a "data" module is
 * live (REQ-106). Modules that don't depend on a probe (static content, or
 * forced unavailable) carry no dataSource.
 */
export type ModuleDataSource =
  | "afrik_peoples"
  | "afrik_countries"
  | "afrik_language_families"
  | "name_records"
  | "migration_events";

// - "static": live as soon as its route resolves — content/utility pages
//   (about, doctrine, free-text search) whose usefulness doesn't hinge on a
//   single table's row count.
// - "data": live only once its backing table (dataSource) holds >= 1 row.
// - "unavailable": never live regardless of routing or data — currently only
//   the comparator, whose picker (PR #338) is not wired into any route.
export type ModuleAvailability = "static" | "data" | "unavailable";

export interface ModuleDefinition {
  id: string;
  title: string;
  category: ModuleCategory;
  accent: ModuleAccent;
  illustration: string;
  page: PageType | null;
  availability: ModuleAvailability;
  dataSource?: ModuleDataSource;
}

// The ten module entries driving the light-home filterable grid (14.7,
// FR92, REQ-106). A module is `live` only once `page` resolves to a real
// localized route AND, for "data" modules, its backing table holds at least
// one row — otherwise it renders as «Bientôt» (soon). See
// src/lib/moduleAvailability.ts for the probe that resolves "data" modules.
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: "peuples",
    title: "Les peuples d'Afrique",
    category: "explorer",
    accent: "ocre",
    illustration: "users",
    page: "peoples",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "pays",
    title: "Les pays d'Afrique",
    category: "explorer",
    accent: "teal",
    illustration: "globe",
    page: "countries",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "familles",
    title: "L'arbre des familles",
    category: "explorer",
    accent: "terre",
    illustration: "network",
    page: "families",
    availability: "data",
    dataSource: "afrik_language_families",
  },
  {
    id: "recherche",
    title: "Recherche libre",
    category: "explorer",
    accent: "perv",
    illustration: "search",
    page: "search",
    availability: "static",
  },
  {
    // ETNI-1196/DEC-019: the corpus behind this card is ethnonyms attached
    // to a people (endonym, exonym, historical spelling), not personal-name
    // genealogy — the card must name the atlas it is, not the question the
    // schema cannot answer.
    id: "noms",
    title: "Noms & appellations",
    category: "explorer",
    accent: "ocre",
    illustration: "tag",
    page: "names",
    availability: "data",
    dataSource: "name_records",
  },
  {
    id: "doctrine",
    title: "La doctrine éditoriale",
    category: "comprendre",
    accent: "teal",
    illustration: "book-open",
    page: "doctrine",
    availability: "static",
  },
  {
    id: "about",
    title: "À propos du projet",
    category: "comprendre",
    accent: "terre",
    illustration: "info",
    page: "about",
    availability: "static",
  },
  {
    // ETNI-1198: the corpus behind this card is 6 sourced events, not the
    // "3 000 ans" the previous title implied — interim honest framing until
    // the sourcing floor set by the spike is met (see ETNI-1198 for the
    // floor and the sourcing plan to reach it).
    id: "frise",
    title: "Premiers repères de migrations",
    category: "comprendre",
    accent: "perv",
    illustration: "history",
    page: "migrations",
    availability: "data",
    dataSource: "migration_events",
  },
  {
    id: "liens",
    title: "Les liens invisibles",
    category: "jouer",
    accent: "ocre",
    illustration: "link-2",
    page: null,
    availability: "static",
  },
  {
    // ETNI-1189/REQ-106: the picker built under PR #338 is not wired/imported
    // into any route yet, so the card must not advertise the comparator as
    // available regardless of its route or of any future data probe.
    id: "comparer",
    title: "Comparer deux peuples",
    category: "jouer",
    accent: "teal",
    illustration: "git-compare",
    page: "compare",
    availability: "unavailable",
  },
];

// @req REQ-106
// A module is live once its route resolves and, for "data" modules, its
// probe confirms at least one row. "unavailable" modules never advertise as
// live regardless of routing or data.
export const isModuleLive = (
  def: Pick<ModuleDefinition, "page" | "availability">,
  dataAvailable: boolean
): boolean => {
  if (def.availability === "unavailable") return false;
  if (def.page === null) return false;
  return def.availability === "data" ? dataAvailable : true;
};

export const getModuleCategories = (): ModuleCategory[] =>
  Array.from(new Set(MODULE_DEFINITIONS.map((def) => def.category)));

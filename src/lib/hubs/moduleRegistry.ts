import type { PageType } from "@/lib/routing";

// ETNI-1216/REQ-114: the three access modes are the three home entry
// points shipped by REQ-113 (ETNI-1215, commit f5115339 — "one per access
// mode (peoples/countries/families)"), not the retired Explorer/Comprendre/
// Jouer verb taxonomy. That taxonomy was dropped from the home hero (FR95,
// see src/app/[lang]/__tests__/home.test.tsx) and from the nav (REQ-111);
// atlas-charter.md §3 still describes it, but it points at
// src/lib/accessModeHubs.ts, which no longer exists — the doc is stale.
export type AccessMode = "peuples" | "pays" | "familles";

export const ACCESS_MODES: AccessMode[] = ["peuples", "pays", "familles"];

// The Supabase table whose row count decides whether a "data" module is
// live (REQ-106), mirroring the deleted src/lib/accessModeHubs.ts.
export type ModuleDataSource =
  | "afrik_peoples"
  | "afrik_countries"
  | "afrik_language_families"
  | "name_records"
  | "migration_events";

// - "data": live only once its backing table (dataSource) holds >= 1 row.
// - "unavailable": never live regardless of data — either no route exists
//   yet (liens has no standalone page, only a nested per-people sub-route)
//   or the surface isn't wired into any route (comparer's picker, per
//   ETNI-1189/REQ-106).
export type ModuleAvailability = "data" | "unavailable";

export interface HubModuleDefinition {
  id: string;
  name: string;
  accessMode: AccessMode;
  page: PageType | null;
  availability: ModuleAvailability;
  dataSource?: ModuleDataSource;
}

// Only the modules with a real resource affinity to one of the three
// access modes are registered here. recherche, doctrine and about stay
// out: they are global/meta pages already reachable from every route's nav
// (REQ-111 puts search in the header; DesktopNavBar/MobileMenu link
// doctrine and about directly) rather than belonging to a single entity
// type — forcing them into a peuples/pays/familles bucket would invent a
// mapping the ticket doesn't support.
export const MODULE_DEFINITIONS: HubModuleDefinition[] = [
  {
    id: "peuples",
    name: "Peuples",
    accessMode: "peuples",
    page: "peoples",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "peuples",
    page: "names",
    availability: "data",
    dataSource: "name_records",
  },
  {
    id: "comparer",
    name: "Comparer deux peuples",
    accessMode: "peuples",
    page: "compare",
    availability: "unavailable",
  },
  {
    id: "pays",
    name: "Pays",
    accessMode: "pays",
    page: "countries",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "frise",
    name: "Premiers repères de migrations",
    accessMode: "pays",
    page: "migrations",
    availability: "data",
    dataSource: "migration_events",
  },
  {
    id: "familles",
    name: "Familles linguistiques",
    accessMode: "familles",
    page: "families",
    availability: "data",
    dataSource: "afrik_language_families",
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "familles",
    page: null,
    availability: "unavailable",
  },
];

export const getModulesForAccessMode = (
  mode: AccessMode
): HubModuleDefinition[] =>
  MODULE_DEFINITIONS.filter((def) => def.accessMode === mode);

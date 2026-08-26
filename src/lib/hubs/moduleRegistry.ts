import { isQuizFeatureEnabled } from "@/lib/featureFlags";
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
//
// The filing rule is "what the reader arrives with, what they leave with":
// Explorer takes a name and returns a fiche, Comprendre takes a question
// and returns an explanation crossing several fiches, Jouer takes nothing
// and returns a result the machine produced. That rule is what moved
// "Noms & appellations" out of Explorer — it answers *why does this people
// carry this name*, which is a question, not a name. It is the most
// decolonial module in the corpus and it was filed on the wrong side.
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
  | "migration_events";

// The build-time switches a module can hang from.
export type ModuleFeatureFlag = "quiz";

// - "data": live only once its backing table (dataSource) holds >= 1 row.
// - "static": a page that exists whatever the corpus holds — search,
//   doctrine and comparer render from code, so probing a table for them
//   would only invent a way for a working route to disappear.
// - "flagged": the route exists but answers notFound() while its feature
//   flag is off. Filing it "static" would advertise a link that 404s;
//   filing it "unavailable" would freeze it at "Bientôt" even with the
//   flag lit.
// - "unavailable": never live regardless of data — no route exists yet
//   (liens has no standalone page, only a nested per-people sub-route).
export type ModuleAvailability = "data" | "static" | "flagged" | "unavailable";

export interface HubModuleDefinition {
  id: string;
  name: string;
  accessMode: AccessMode;
  page: PageType | null;
  availability: ModuleAvailability;
  dataSource?: ModuleDataSource;
  featureFlag?: ModuleFeatureFlag;
}

// The flag decides whether the module exists at all, never the corpus: a
// module switched off is not "coming soon", it is not there.
const FLAG_RESOLVERS: Record<ModuleFeatureFlag, () => boolean> = {
  quiz: isQuizFeatureEnabled,
};

/**
 * Live without asking the database — what the home page can know on its
 * own. Both the hub's availability probe and the home card read this, and
 * that shared lock is what stops the two from drifting apart: without it a
 * flagged-off module would show as a live axis on the home page and as
 * nothing at all on the hub behind it.
 */
// Narrowed to the two fields it reads so the hub's availability probe can
// forward its own already-narrowed argument straight through.
// @req REQ-106
export function isModuleEnabled(
  def: Pick<HubModuleDefinition, "availability" | "featureFlag">
): boolean {
  if (def.availability === "unavailable") return false;
  if (def.availability === "flagged") {
    return def.featureFlag ? FLAG_RESOLVERS[def.featureFlag]() : false;
  }
  return true;
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
  // Comprendre runs from the most concrete question to the method that
  // answers it: why this name, where they came from, who says so.
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "comprendre",
    page: "names",
    availability: "data",
    dataSource: "name_records",
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
    id: "doctrine",
    name: "La doctrine éditoriale",
    accessMode: "comprendre",
    page: "doctrine",
    availability: "static",
  },
  {
    id: "comparer",
    name: "Comparer deux peuples",
    accessMode: "jouer",
    page: "compare",
    availability: "static",
  },
  {
    id: "quiz",
    name: "Le quiz des parcours",
    accessMode: "jouer",
    page: "quiz",
    availability: "flagged",
    featureFlag: "quiz",
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    availability: "unavailable",
  },
];

// @req REQ-114
export const getModulesForAccessMode = (
  mode: AccessMode
): HubModuleDefinition[] =>
  MODULE_DEFINITIONS.filter((def) => def.accessMode === mode);

import { isQuizFeatureEnabled } from "@/lib/featureFlags";
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
  | "migration_events"
  | "afrik_people_relations"
  | "quiz_questions";

// The build-time switches a module can hang from.
export type ModuleFeatureFlag = "quiz";

// REQ-120 gave Jouer eleven games, and eleven peers is past what a radial
// layout can lay out and past what a reader takes in as a set. A shelf is
// the intermediate level: the reader picks the corpus entity a game
// questions, then the game.
//
// The filing criterion is the entity the question is *about*, not the table
// the query reads. The two agree everywhere but one — "Range-le dans sa
// famille" asks about a people and reads afrik_language_families — which is
// why the shelf is declared rather than derived from `dataSource`. A
// taxonomy the reader sees should not move because a query changed table.
export type ModuleGroupId =
  | "jeux-peuples"
  | "jeux-pays"
  | "jeux-migrations"
  | "jeux-liens"
  | "jeux-quiz";

export interface ModuleGroup {
  id: ModuleGroupId;
  /** What the reader reads on the shelf. */
  label: string;
}

// Declaration order is the order the shelves appear.
// @req REQ-120
export const MODULE_GROUPS: Record<ModuleGroupId, ModuleGroup> = {
  "jeux-peuples": { id: "jeux-peuples", label: "Les peuples" },
  "jeux-pays": { id: "jeux-pays", label: "Les pays" },
  "jeux-migrations": { id: "jeux-migrations", label: "Les migrations" },
  "jeux-liens": { id: "jeux-liens", label: "Les liens" },
  // The quiz questions the reader rather than the corpus, so it sits on no
  // entity's shelf. It is alone there, which the panel reads as "render the
  // module, not a shelf".
  "jeux-quiz": { id: "jeux-quiz", label: "Le quiz" },
};

// - "data": live only once its backing table (dataSource) holds >= 1 row.
// - "static": a page that exists whatever the corpus holds — search,
//   doctrine and about render from code, so probing a table for them would
//   only invent a way for a working route to disappear.
// - "flagged": the route exists but answers notFound() while its feature
//   flag is off. Filing it "static" would advertise a link that 404s;
//   filing it "unavailable" would freeze it at "Bientôt" even with the
//   flag lit.
// - "unavailable": never live regardless of data, for a module whose
//   surface isn't wired into any route yet. No module is in that state
//   since REQ-120 gave the Jouer hub its games; the case is kept for the
//   next module announced before its route exists.
export type ModuleAvailability = "data" | "static" | "flagged" | "unavailable";

export interface HubModuleDefinition {
  id: string;
  name: string;
  accessMode: AccessMode;
  page: PageType | null;
  availability: ModuleAvailability;
  dataSource?: ModuleDataSource;
  /** A game under the Jouer hub, addressed as /fr/jouer/<gameSlug> rather than by PageType. Keeps PageType a closed union instead of growing eleven variants. */
  gameSlug?: string;
  featureFlag?: ModuleFeatureFlag;
  /** Which shelf the module sits on. Jouer only — see ModuleGroupId. */
  group?: ModuleGroupId;
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
    // Reached only from the header's flat link list before the three axes
    // replaced it. It answers "where does what I am reading come from",
    // which is Comprendre's filing rule, so it belongs on the axis rather
    // than in a utility row beside it.
    id: "regards-colonisation",
    name: "Regards : colonisation et résistances",
    accessMode: "comprendre",
    page: "colonization",
    availability: "static",
  },
  // Jouer: the quiz keeps its own route; every other entry is a game the
  // hub reaches by slug. comparer and liens keep the ids they shipped with
  // as "Bientôt" placeholders — the surfaces they stood in for now exist,
  // so absorbing them beats leaving two dead entries beside the live ones.
  {
    id: "quiz",
    group: "jeux-quiz",
    name: "Le quiz des parcours",
    accessMode: "jouer",
    page: "quiz",
    availability: "flagged",
    featureFlag: "quiz",
  },
  {
    id: "appellations",
    group: "jeux-peuples",
    name: "Eux, ou les autres ?",
    accessMode: "jouer",
    page: null,
    gameSlug: "appellations",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "plus-ou-moins",
    group: "jeux-peuples",
    name: "Plus ou moins ?",
    accessMode: "jouer",
    page: null,
    gameSlug: "plus-ou-moins",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "mercator",
    group: "jeux-pays",
    name: "La taille qu'on vous a cachée",
    accessMode: "jouer",
    page: null,
    gameSlug: "mercator",
    availability: "data",
    dataSource: "afrik_countries",
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
    group: "jeux-pays",
    name: "Vraie taille",
    accessMode: "jouer",
    page: null,
    gameSlug: "vraie-taille",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "repartition",
    group: "jeux-peuples",
    name: "Où vivent-ils ?",
    accessMode: "jouer",
    page: null,
    gameSlug: "repartition",
    availability: "data",
    dataSource: "afrik_peoples",
  },
  {
    id: "pays-davant",
    group: "jeux-pays",
    name: "Le pays d'avant",
    accessMode: "jouer",
    page: null,
    gameSlug: "pays-davant",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "royaumes",
    group: "jeux-pays",
    name: "Royaumes perdus",
    accessMode: "jouer",
    page: null,
    gameSlug: "royaumes",
    availability: "data",
    dataSource: "afrik_countries",
  },
  {
    id: "migrations",
    group: "jeux-migrations",
    name: "Le fil des migrations",
    accessMode: "jouer",
    page: null,
    gameSlug: "migrations",
    availability: "data",
    dataSource: "migration_events",
  },
  {
    id: "liens",
    group: "jeux-liens",
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
    group: "jeux-peuples",
    name: "Range-le dans sa famille",
    accessMode: "jouer",
    page: null,
    gameSlug: "familles",
    availability: "data",
    dataSource: "afrik_language_families",
  },
  {
    id: "frontieres",
    group: "jeux-peuples",
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

/**
 * What the header may list for an access mode — the same rule
 * `getHubModules` applies, minus its Supabase probe.
 *
 * The probe is deliberately not repeated here. The header renders inside
 * PageLayout, a client component that some fifty page components mount;
 * threading a server-resolved availability list through all of them would
 * cost a wide refactor to close a gap that only opens when a backing table
 * is empty. The header therefore trusts the static lock — a module behind a
 * dark flag is dropped rather than announced, because its route answers
 * notFound() — and the hub behind the click keeps the probe that can also
 * see an empty corpus.
 */
// @req REQ-114 @req REQ-106
export const getNavModules = (mode: AccessMode): HubModuleDefinition[] =>
  getModulesForAccessMode(mode).filter(
    (def) => def.availability !== "flagged" || isModuleEnabled(def)
  );

/**
 * The four CVD-validated categorical accents, in the order the menu walks
 * them. Terre is in: on a module card the accent tints one 28px tile, which
 * is the fiche-scope conflict the axis list avoids, not a repeat of it.
 */
// @req REQ-114
export const ACCENT_CYCLE = [
  "afh-accent-ocre",
  "afh-accent-teal",
  "afh-accent-terre",
  "afh-accent-perv",
] as const;

const ACCENT_INDEX_BY_MODULE_ID = new Map(
  MODULE_DEFINITIONS.map((def, index) => [def.id, index])
);

/**
 * A module's accent is its position in the registry, cycled through the
 * four. The walk is continuous across the whole registry rather than
 * restarting per axis — that is what the mockup does, and it is why
 * Explorer reads ocre · teal · terre · perv
 * (docs/design/mockups/parts/nav-core.js).
 *
 * Derived rather than declared: an accent field on twenty-one entries is
 * twenty-one chances to file a duplicate beside its neighbour.
 */
// @req REQ-114
export function accentForModule(
  def: Pick<HubModuleDefinition, "id">
): (typeof ACCENT_CYCLE)[number] {
  const index = ACCENT_INDEX_BY_MODULE_ID.get(def.id) ?? 0;
  return ACCENT_CYCLE[index % ACCENT_CYCLE.length];
}

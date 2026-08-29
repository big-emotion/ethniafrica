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
// `jeux-peuples` went with « Eux, ou les autres ? », the only game that ever
// stood on it (charter §1). An empty shelf is a heading with nothing under
// it, so the shelf is removed rather than left declared.
export type ModuleGroupId = "jeux-pays" | "jeux-quiz";

export interface ModuleGroup {
  id: ModuleGroupId;
  /** What the reader reads on the shelf. */
  label: string;
}

// Declaration order is the order the shelves appear.
// @req REQ-120
export const MODULE_GROUPS: Record<ModuleGroupId, ModuleGroup> = {
  "jeux-pays": { id: "jeux-pays", label: "Les pays" },
  // The quiz questions the reader rather than the corpus, so it sits on no
  // entity's shelf. It is alone there, which the panel reads as "render the
  // module, not a shelf".
  "jeux-quiz": { id: "jeux-quiz", label: "Le quiz" },
};

// Every module the registry declares is listed and linked. What a module
// waits on is its corpus, never a switch:
//
// - "data": live once its backing table (dataSource) holds >= 1 row.
// - "static": a page that exists whatever the corpus holds — search and
//   doctrine render from code, so probing a table for them would only
//   invent a way for a working route to disappear.
//
// "flagged" and "unavailable" are gone. The first hid a built route behind
// an environment variable, so the quiz existed and no reader could reach
// it; the second reserved a way to announce a module before its route
// existed, and nothing used it. A module that cannot be reached is not a
// module — it is unmerged work.
//
// Whether the module is worth reaching is a different question, and it is
// `EditorialReadiness` below that answers it.
export type ModuleAvailability = "data" | "static";

/**
 * Whether the corpus behind a module is worth a reader's trip
 * (atlas-charter.md §3). Orthogonal to `availability`, which only ever asks
 * whether the module *has* anything: a table can be full of rows nobody
 * should be invited to read, and `static` has no table to consult at all.
 *
 * - "ready": the module is offered.
 * - "draft": the module is listed, routed and reachable by URL, and the hub
 *   renders it as the inert **Bientôt** row — the same row an empty module
 *   gets, because the reader is being told the same thing.
 *
 * Declared rather than measured, and deliberately not an environment
 * variable: the answer is a property of the corpus, so it is identical on
 * every machine, and filling a module means flipping one word here rather
 * than setting a variable somewhere a reader cannot see.
 */
export type EditorialReadiness = "ready" | "draft";

// @req REQ-114
export const EDITORIAL_READINESS_STATES: EditorialReadiness[] = [
  "ready",
  "draft",
];

export interface HubModuleDefinition {
  id: string;
  name: string;
  accessMode: AccessMode;
  page: PageType | null;
  availability: ModuleAvailability;
  /**
   * Optional here only so the HubModule fixtures scattered across the home
   * and hub suites keep compiling. Every registry entry must declare one —
   * moduleVisibilityCharter.test.ts fails on an entry that omits it, because
   * a module that inherits maturity by omission is exactly the module that
   * ships half-written.
   */
  editorialReadiness?: EditorialReadiness;
  dataSource?: ModuleDataSource;
  /** A game under the Jouer hub, addressed as /fr/jouer/<gameSlug> rather than by PageType. Keeps PageType a closed union instead of growing eleven variants. */
  gameSlug?: string;
  /** Which shelf the module sits on. Jouer only — see ModuleGroupId. */
  group?: ModuleGroupId;
  /**
   * How this module fills the home's hero slot, or absent if it cannot
   * (REQ-115). See HeroPreviewKind.
   *
   * It names a shape and never holds a component, because this file is
   * imported by server code — moduleAvailability's probe, and the home page
   * itself — while a preview is a `dynamic(..., { ssr: false })` island,
   * which Next permits only inside a Client Component. Two switches read
   * this: loadHeroPreview resolves the data, HeroModuleStage renders it.
   *
   * It declares the shape a module *can* render, not that the home band
   * will open on it: which of those shapes the band accepts is
   * `HERO_SLOT_KINDS` (heroRotation.ts), and games are deliberately not
   * among them.
   */
  heroable?: HeroPreviewKind;
}

/**
 * The shapes a hero preview comes in (REQ-115).
 *
 * - "globe": the textured globe, self-contained, no corpus behind it.
 * - "game": the play loop itself, rounds built server-side exactly as
 *   /fr/jouer/[jeu] builds them. One branch covers all eleven games.
 * - "migration-paths": the sourced events drawn on the Africa basemap.
 * - "family-crown": the linguistic families laid out in a radial crown,
 *   each weighted by the peoples it holds.
 *
 * With strictNullChecks off a switch missing a case returns undefined and
 * compiles clean, so exhaustiveness over this union is a test's job, not
 * the compiler's — see HeroModuleStage's own suite.
 */
// @req REQ-115
export type HeroPreviewKind =
  | "globe"
  | "game"
  | "migration-paths"
  | "family-crown";

// @req REQ-115
export const HERO_PREVIEW_KINDS: HeroPreviewKind[] = [
  "globe",
  "game",
  "migration-paths",
  "family-crown",
];

// @req REQ-114
export const MODULE_DEFINITIONS: HubModuleDefinition[] = [
  {
    id: "peuples",
    name: "Les peuples d'Afrique",
    accessMode: "explorer",
    page: "peoples",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_peoples",
  },
  {
    id: "pays",
    name: "Les pays d'Afrique",
    accessMode: "explorer",
    page: "countries",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_countries",
  },
  {
    id: "familles",
    name: "L'arbre des familles",
    accessMode: "explorer",
    page: "families",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_language_families",
    heroable: "family-crown",
  },
  {
    id: "recherche",
    name: "Recherche libre",
    accessMode: "explorer",
    page: "search",
    availability: "static",
    editorialReadiness: "ready",
  },
  // Comprendre runs from the most concrete question to the method that
  // answers it: why this name, where they came from, who says so.
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "comprendre",
    page: "names",
    availability: "data",
    // This read "ready", on the reasoning that an empty `name_records`
    // already said everything there was to say. It does not: the corpus holds
    // one fiche — `dataset/source/afrik/noms/PPL_YORUBA.json`, alone — for 803
    // peoples, and the loader is wired. The row count would therefore stop
    // speaking the moment that single fiche lands, and offer an atlas of names
    // that names one people. Readiness is what withholds the invitation while
    // the route stays built.
    editorialReadiness: "draft",
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
    // Six sourced events. The table is not empty, so no row count was ever
    // going to hold this back — and six pins do not answer "d'où
    // viennent-ils". Readiness is the only field that can say so.
    editorialReadiness: "draft",
    dataSource: "migration_events",
    heroable: "migration-paths",
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
    // Static, so it has no table whose emptiness could have spoken for it:
    // before this field the page was structurally incapable of being marked
    // in preparation, whatever state its sections were in.
    editorialReadiness: "draft",
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
    // Read from its own bank, like every other data module reads its table.
    // It used to hang from `NEXT_PUBLIC_FEATURE_QUIZ`, which meant a built
    // route no reader could reach and a hub entry that quietly vanished.
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "quiz_questions",
  },
  {
    id: "mercator",
    group: "jeux-pays",
    name: "La taille qu'on vous a cachée",
    accessMode: "jouer",
    page: null,
    gameSlug: "mercator",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_countries",
    // The one game whose hero preview is not its play loop. The home globe
    // *is* this game's lesson stated without a question — "chaque pastille
    // retrouve sa surface réelle" — and it is the band the home has always
    // opened on. The chip still sends a reader to the game itself.
    heroable: "globe",
  },
  {
    id: "doctrine",
    name: "La doctrine éditoriale",
    accessMode: "comprendre",
    page: "doctrine",
    availability: "static",
    editorialReadiness: "ready",
  },
];

// @req REQ-114
export const getModulesForAccessMode = (
  mode: AccessMode
): HubModuleDefinition[] =>
  MODULE_DEFINITIONS.filter((def) => def.accessMode === mode);

/**
 * What the header lists for an access mode: every module of that mode.
 *
 * There is nothing left to filter. The header renders inside PageLayout, a
 * client component some fifty pages mount, so it cannot run the hub's
 * Supabase probe — but the probe only ever answers "is this module's corpus
 * empty", never "does this module exist". A reader following a header link
 * to a module whose table is empty lands on that module's own empty state,
 * which is a smaller failure than a link that was never shown.
 */
// @req REQ-114 @req REQ-106
export const getNavModules = (mode: AccessMode): HubModuleDefinition[] =>
  getModulesForAccessMode(mode);

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

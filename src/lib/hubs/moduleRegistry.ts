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
// and returns a result the machine produced.
//
// Two consequences of that rule are worth stating, because both were once
// filed the other way:
//
//   · "Appellations" sits under Explorer. It was moved out on the reading
//     that it answers *why does this people carry this name* — a question.
//     ETNI-1453 (DEC-038) settles it the other way: the name becomes a
//     corpus entity with its own fiche, its own search-result kind and its
//     own endpoint, so Appellations takes a name and returns a fiche,
//     exactly like pays, peuples and familles.
//   · Doctrine and À propos are on no axis at all. An access mode is a way
//     into the *corpus*; those two pages describe the *project*, so filing
//     them behind a reading intention promised a fiche and delivered a
//     colophon. They are reached from the footer's "Le projet" rubric.
export type AccessMode = "atlas" | "dossiers" | "jeux";

// @req REQ-114
export const ACCESS_MODES: AccessMode[] = ["atlas", "dossiers", "jeux"];

// @req REQ-114
export const ACCESS_MODE_LABELS = {
  atlas: "L'atlas",
  dossiers: "Les dossiers",
  jeux: "Jouer",
} satisfies Record<AccessMode, string>;

// One categorical accent per mode, from the CVD-validated four (color.css
// §"Categorical accents"). Terre stays out: it is the fiche-level accent
// for families, and reusing it for an axis would make the axis and the
// entity read as the same scope.
// @req REQ-114
export const ACCENT_BY_ACCESS_MODE: Record<AccessMode, string> = {
  atlas: "afh-accent-ocre",
  dossiers: "afh-accent-teal",
  jeux: "afh-accent-perv",
};

// The Supabase table whose row count decides whether a "data" module is
// live (REQ-106).
export type ModuleDataSource =
  | "afrik_peoples"
  | "afrik_countries"
  | "afrik_language_families"
  | "afrik_languages"
  | "afrik_patronymes"
  | "name_records"
  | "migration_events"
  | "afrik_people_relations"
  | "quiz_questions";

// REQ-120 gave Jouer 11 games, and that many peers is past what a radial
// layout can lay out and past what a reader takes in as a set. A shelf is
// the intermediate level: the reader picks the corpus entity a game
// questions, then the game. Two scope cuts since (games-charter.md §1) have
// left two modules, `quiz` and `mercator`, each alone on its shelf — the
// mechanism is kept because a returning game lands on a shelf without a
// redesign.
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
// - "static": a page that exists whatever the corpus holds — search and the
//   anecdotes render from code, so probing a table for them would only
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
  /** A game under the Jouer hub, addressed as /fr/jeux/<gameSlug> rather than by PageType. Keeps PageType a closed union instead of growing a variant per game. */
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
 *   /fr/jeux/[jeu] builds them. One branch covers every game the registry
 *   declares.
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
  // Pays opens Explorer. Of the four entry points it is the one a reader
  // already holds a name for before the atlas has taught them anything, and
  // the fiche it opens lists the peoples underneath it — so it is an entry
  // into the peoples too. Peuples first asked a reader to name a people in
  // order to find one.
  {
    id: "pays",
    name: "Les pays d'Afrique",
    accessMode: "atlas",
    page: "countries",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_countries",
  },
  {
    id: "peuples",
    name: "Les peuples d'Afrique",
    accessMode: "atlas",
    page: "peoples",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_peoples",
  },
  {
    id: "familles",
    name: "L'arbre des familles",
    accessMode: "atlas",
    page: "families",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_language_families",
    heroable: "family-crown",
  },
  // Filed directly after familles: a language is the next rung down the
  // AFRIK hierarchy (famille → langue → peuple → pays), and a reader who
  // arrives holding a language's name reaches it the same way as one holding
  // a family's (ETNI-1801/ETNI-1795).
  {
    id: "langues",
    name: "Les langues d'Afrique",
    accessMode: "atlas",
    page: "languages",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_languages",
  },
  // The fourth nominal entry point. A reader who arrives holding a name the
  // corpus files as an appellation — an exonym, a colonial-era spelling —
  // arrives the same way as one holding a country's, and ETNI-1453 gives
  // that name a fiche of its own to land on.
  {
    id: "noms",
    name: "Appellations",
    accessMode: "atlas",
    page: "names",
    availability: "data",
    // The published people fiches now feed the index directly: their autonyms,
    // exonyms and attested variants give this route corpus-wide coverage, while
    // ambiguous prose remains refused rather than guessed. The invitation can
    // therefore follow the route that was already public.
    editorialReadiness: "ready",
    dataSource: "name_records",
  },
  // Distinct from "noms"/Appellations: a patronyme is the naming *system* a
  // person is named under, not a people's autonym/exonym. Filed beside it
  // because both take a name and return a fiche, which is Explorer's rule,
  // but kept a separate id so neither shadows the other (ETNI-1801).
  //
  // The id stays `patronymes` and the label is `Nom`, which is DEC-038's split
  // rather than an inconsistency: the reader-facing word is the one a
  // francophone types, and the internal word is what keeps this entity apart
  // from the two other things the repository calls "nom" — the ethnonym
  // dossier above and ARCH-018's person. This entry said "Patronymes" for the
  // whole of ETNI-1803, so the menu named the axis one way while the trail,
  // the footer and the URL named it another.
  {
    id: "patronymes",
    name: "Nom",
    accessMode: "atlas",
    page: "patronymes",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_patronymes",
  },
  // Recherche closes Explorer: it is where a reader goes once naming the
  // entity has not been enough.
  {
    id: "recherche",
    name: "Recherche libre",
    accessMode: "atlas",
    page: "search",
    availability: "static",
    editorialReadiness: "ready",
  },
  // Comprendre runs from the most concrete question to the method that
  // answers it: what the corpus turned up, where they came from, who says so.
  // The anecdotes are the only Comprendre module whose corpus is the repo
  // rather than the database: the bank is a TypeScript constant, so there is
  // no table for the availability probe to count and "static" is the honest
  // answer. Readiness is "ready" because the surface is complete on the day
  // it ships — every fact it holds is written and cited, which is not
  // something the modules around it can say yet.
  // First of the rubric, and not by seniority: it is the question the other
  // three presuppose. The anecdotes bank is already onomastic by contract —
  // "every fact here is about a *name*: who gave it, when, and what it was
  // hiding" — and the colonial gaze is one answer to the same question. This
  // dossier is where that question is put, so it opens the axis.
  //
  // `static` for the same reason the anecdotes are: the corpus behind it is
  // the repository, not a table, so there is nothing for the availability
  // probe to count and "static" is the honest answer.
  {
    id: "nommer",
    name: "Qui a donné ce nom ?",
    accessMode: "dossiers",
    page: "nommer",
    availability: "static",
    // Written and sourced on the day it ships. What is still open is the
    // walk-back from Wikipedia to the primary works, which the dossier's own
    // suite tracks by name — see AWAITING_PRIMARY_SOURCE.
    editorialReadiness: "ready",
  },
  {
    id: "anecdotes",
    name: "Anecdotes",
    accessMode: "dossiers",
    page: "anecdotes",
    availability: "static",
    editorialReadiness: "ready",
  },
  {
    // Named for what the corpus actually holds — six sourced events, not a
    // three-millennia timeline (ETNI-1198).
    id: "frise",
    name: "Premiers repères de migrations",
    accessMode: "dossiers",
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
    accessMode: "dossiers",
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
    name: "Le quiz",
    accessMode: "jeux",
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
    accessMode: "jeux",
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
 * Derived rather than declared: an accent field on every entry is one more
 * chance per entry to file a duplicate beside its neighbour. The cost is that
 * inserting, removing or reordering an entry repaints every module after it,
 * which is why the whole map is pinned in moduleRegistry.test.ts.
 */
// @req REQ-114
export function accentForModule(
  def: Pick<HubModuleDefinition, "id">
): (typeof ACCENT_CYCLE)[number] {
  const index = ACCENT_INDEX_BY_MODULE_ID.get(def.id) ?? 0;
  return ACCENT_CYCLE[index % ACCENT_CYCLE.length];
}

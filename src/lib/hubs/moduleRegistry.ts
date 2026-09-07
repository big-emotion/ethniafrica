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
//
// The dossiers axis then grew from three modules to eleven without ever being
// filed, and the header panel drew all eleven as one flat row — ten of them
// wearing **Bientôt**, four of them about one country. A reader met the Congo
// as the shape of the axis rather than as four of its readings.
//
// Its rubrics are the domain vocabulary the fiches already use on the reader —
// `country.ts`'s culture block says Religions · Économie · Organisation ·
// Relations — because a reader who has read one country fiche has already been
// taught these words. The eight entries in `dossiers/themes.ts` are a
// different organ and stay one: pairs of words (« Pouvoirs et territoires »)
// that work as a filter on the hub and read as prose in a menu heading.
export type ModuleGroupId =
  | "dossiers-noms"
  | "dossiers-organisation"
  | "dossiers-religions"
  | "dossiers-territoires"
  | "dossiers-populations"
  | "dossiers-economie"
  | "jeux-pays"
  | "jeux-quiz";

/**
 * The order the shelves appear, and the whole of what the registry declares
 * about them.
 *
 * A shelf carries no label here. It used to, and the labels were French
 * literals in a file `check:copy-literals` does not exempt — tolerated only
 * because they predate the gate. Rubric names are reader-facing copy, so they
 * live where reader-facing copy lives, `i18n/copy/hubs.ts`, in both locales.
 * Modules keep a registry `name` *and* a dictionary entry because theirs
 * predates the i18n move; a rubric is new, so it starts with one home and
 * cannot drift between two.
 */
// @req REQ-120
export const MODULE_GROUP_ORDER: readonly ModuleGroupId[] = [
  "dossiers-noms",
  "dossiers-organisation",
  "dossiers-religions",
  "dossiers-territoires",
  "dossiers-populations",
  "dossiers-economie",
  "jeux-pays",
  // The quiz questions the reader rather than the corpus, so it sits on no
  // entity's shelf.
  "jeux-quiz",
];

/**
 * The axes whose panel is filed under rubric headings.
 *
 * Declared rather than inferred from "does this axis have shelves", because
 * Jouer's two shelves hold one module each since the charter's scope cuts and
 * filing them would put a heading over a single card on a surface nobody asked
 * to change. Declared rather than written as `axis === "dossiers"` in the
 * header, because special-casing that axis in that file is exactly what left
 * it drawing a different navigation from its two neighbours.
 */
// @req REQ-120
export const RUBRIC_FILED_AXES: readonly AccessMode[] = ["dossiers"];

/**
 * How many readings a rubric lists in the tray before it starts counting.
 *
 * A menu is not an index. The corpus behind a rubric is expected to reach the
 * hundreds — the atlas already holds 804 peoples behind one menu row — and a
 * tray that printed every record would put that list into the markup of every
 * page on the site.
 *
 * Four rather than three or five because four is what the tallest rubric holds
 * today, so the cap is armed and tested without changing what a reader
 * currently sees.
 */
// @req REQ-120
export const RUBRIC_MENU_LIMIT = 4;

/**
 * How many readings a rubric lists in the panel.
 *
 * One, because the panel's constraint is height, not length: it hangs off a
 * pinned bar and every card it adds is a card the reader has to scroll a menu
 * to pass. At four it stood five card-heights tall and the six rubrics could
 * not sit abreast — the last two fell under the first four.
 *
 * A rubric is therefore a heading and a single reading, and the panel is one
 * row of them. What a rubric holds beyond that is the hub's to list; the tray,
 * which scrolls and is the phone's whole navigation, keeps `RUBRIC_MENU_LIMIT`.
 */
// @req REQ-120
export const RUBRIC_PANEL_LIMIT = 1;

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
  /**
   * The plural noun a sentence uses for this class, where `name` is the label
   * a menu entry wears. "Les peuples d'Afrique" heads a nav item; prose says
   * "des peuples".
   *
   * Declared by the six corpus classes — an atlas module with a `dataSource` —
   * and by nothing else, because only a thing the corpus *holds* belongs in a
   * sentence describing what the corpus holds. It exists because these six
   * nouns were written out by hand on every surface that describes the
   * product, and each copy fell behind the corpus at its own pace: the site's
   * own meta description still named four of them.
   *
   * Not to be confused with `CORPUS_CLASSES` (corpusClasses.ts), which is
   * deliberately five. That list prints *figures*, and a figure claims
   * exhaustiveness — "30 patronymes" beside "3 134 appellations" understates
   * the product and misstates its coverage. Naming a class costs no such
   * claim, so prose names all six and the census counts five.
   */
  corpusNoun?: string;
  /**
   * Kept out of the header and the hub grid, and out of nothing else.
   *
   * The third question the registry answers about a module, after "can it be
   * reached" (`availability`) and "is it worth the trip" (`editorialReadiness`):
   * would a reader ever arrive *wanting to browse this*. Some corpus surfaces
   * are lookups — you reach them holding the term you came for — and a menu
   * row is the wrong organ for them, because a menu invites a walk.
   *
   * Measured before it was believed. Appellations occupied one of seven atlas
   * rows on every page of the site and took 0 visits out of 219 pageviews in
   * the 30 days to 6 September 2026, while its own reason for existing — turn a
   * name heard elsewhere into the people it designates — was never wired into
   * the search that would have asked it. A row nobody clicks costs the six
   * beside it, since a reader reads the whole set before choosing any of it.
   *
   * This withholds a menu row and nothing more: the route stays built, the
   * trail keeps its axis crumb, the site plan keeps its line, the crawler keeps
   * its link. That is the whole difference between this field and
   * `NEXT_PUBLIC_FEATURE_QUIZ`, which made a finished page answer notFound() on
   * one machine and serve on another.
   */
  unlisted?: boolean;
  /** A game under the Jouer hub, addressed as /fr/jeux/<gameSlug> rather than by PageType. Keeps PageType a closed union instead of growing a variant per game. */
  gameSlug?: string;
  /** Which shelf or rubric the module sits under — see ModuleGroupId. */
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
  "globe" | "game" | "migration-paths" | "family-crown";

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
    corpusNoun: "Pays",
  },
  {
    id: "peuples",
    name: "Les peuples d'Afrique",
    accessMode: "atlas",
    page: "peoples",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_peoples",
    corpusNoun: "Peuples",
  },
  // Named after what it holds, like its four neighbours. "L'arbre des
  // familles" named the *rendering* — a tree — and left the reader to supply
  // the noun: familles de quoi. The corpus had the answer written down all
  // along, one line below in `corpusNoun`.
  {
    id: "familles",
    name: "Les familles linguistiques",
    accessMode: "atlas",
    page: "families",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_language_families",
    corpusNoun: "Familles linguistiques",
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
    corpusNoun: "Langues",
  },
  // The fifth nominal entry point: a patronyme is the naming *system* a person
  // is named under, distinct from the autonyms and exonyms a people carries
  // (the `noms` module below). Filed on the same axis because both take a name
  // and return a fiche, which is the atlas's rule, but kept on a separate id so
  // neither shadows the other (ETNI-1801).
  //
  // The id stays `patronymes` and the reader-facing word is `nom`, which is
  // DEC-038's split rather than an inconsistency: the public label is the word
  // a francophone types, and the internal word is what keeps this entity apart
  // from the two other things the repository calls "nom" — the appellations
  // index and ARCH-018's person. This entry said "Patronymes" for the whole of
  // ETNI-1803, so the menu named the axis one way while the trail, the footer
  // and the URL named it another.
  //
  // « Les noms d'Afrique » rather than « Noms » since the header amendment of
  // 7 September 2026, for the reason the plural was settled first: the entry
  // stands in a row of « Les pays d'Afrique », « Les peuples d'Afrique »,
  // « Les langues d'Afrique », and a bare noun among them reads as a field on
  // a form rather than as the fifth index. The phrase is not written for the
  // menu — it is already the title of the page the entry opens (`facets.ts`).
  // The short forms survive where they are right: the trail, the footer
  // directory, the plan du site, and the singular above one fiche
  // (`patronymes.eyebrow`).
  {
    id: "patronymes",
    name: "Les noms d'Afrique",
    accessMode: "atlas",
    page: "patronymes",
    availability: "data",
    editorialReadiness: "ready",
    dataSource: "afrik_patronymes",
    corpusNoun: "Noms",
  },
  // Recherche closes the atlas: it is where a reader goes once naming the
  // entity has not been enough.
  {
    id: "recherche",
    name: "Recherche libre",
    accessMode: "atlas",
    page: "search",
    availability: "static",
    editorialReadiness: "ready",
  },
  // Last, and out of the menu — see `unlisted` on HubModuleDefinition for the
  // measurement that put it there.
  //
  // A reader does not arrive wanting to browse three thousand attested name
  // forms; they arrive holding one form and wanting the people behind it. That
  // is a lookup, and the organ for a lookup is the search field, not a menu row
  // — except that the search does not index name records either
  // (`SEARCH_RESULT_GROUPS`), which is the ticket this entry is waiting on and
  // the thing that would make it useful. Until then it is reached from the plan
  // du site and from the footer directory, as the glossary is.
  //
  // Its position is after `recherche` rather than beside the other name module
  // because declaration order is also the accent walk: mid-list, it would leave
  // a gap in a colour sequence no reader can see it leaving.
  {
    id: "noms",
    name: "Appellations",
    accessMode: "atlas",
    page: "names",
    availability: "data",
    // The published people fiches feed the index directly: their autonyms,
    // exonyms and attested variants give this route corpus-wide coverage, while
    // ambiguous prose remains refused rather than guessed.
    editorialReadiness: "ready",
    dataSource: "name_records",
    corpusNoun: "Appellations",
    unlisted: true,
  },
  // ── THE DOSSIERS FREEZE ────────────────────────────────────────────────
  //
  // Every module on this axis but `anecdotes` is `draft`, and none of them is
  // half-written: they are withdrawn while their editorial is reworked. What
  // was reviewed and rejected is the *shape* of the reading — pages that
  // arrive at a subject through a uniform scaffold of headings rather than
  // through the subject itself, which is a structure no reader asked for.
  //
  // Two things follow, and they are one decision, not two:
  //
  //   · the hub and the menu list each module as the inert **Bientôt** card;
  //   · the route behind it serves nothing (`isModulePublished`, moduleOffer).
  //
  // The second half is the one that did not exist before. `draft` used to dim
  // an entry and leave its page readable by URL, so a dossier its editor had
  // withdrawn was still served in full, indexed, and linkable from a fiche.
  // A chip that says "Bientôt" over a page that answers 200 is a chip that
  // lies, so readiness now governs the route as well as the row.
  //
  // Unfreezing a dossier is one word here — "draft" back to "ready" — and
  // nothing else: the routes, the sitemap, the fiche cross-links and the two
  // menus all read this field rather than a list of their own.
  //
  // ───────────────────────────────────────────────────────────────────────
  //
  // The anecdotes are the only module on this axis whose corpus is the repo
  // rather than the database: the bank is a TypeScript constant, so there is
  // no table for the availability probe to count and "static" is the honest
  // answer. They stay `ready` through the freeze — short, sourced, and
  // structurally unlike the long dossiers being reworked.
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
    group: "dossiers-noms",
    name: "Qui a donné ce nom ?",
    accessMode: "dossiers",
    page: "nommer",
    availability: "static",
    // Withdrawn with the rest of the axis — see THE DOSSIERS FREEZE above.
    // The five chapters are written and cited; what is being reworked is the
    // shape of the reading, not its sourcing.
    editorialReadiness: "draft",
  },
  {
    id: "anecdotes",
    group: "dossiers-noms",
    name: "Anecdotes",
    accessMode: "dossiers",
    page: "anecdotes",
    availability: "static",
    editorialReadiness: "ready",
  },
  // The seven Realites dossiers are NOT here, and that is the point.
  //
  // Each used to be a module: an entry in this list, a PageType, two slugs, a
  // glyph, two menu labels and two catalogue entries — nine edits across five
  // files to publish one reading, and a menu that grew a row per dossier. A
  // module is a *surface* of the axis; a dossier is a record of the corpus,
  // like a people or a country. The atlas already draws that line: one menu row
  // for `peuples`, and 804 peoples behind it.
  //
  // They now live only in dataset/source/afrik/dossiers, declare their own
  // rubric and readiness, and reach the menu through `getDossierMenuEntries`.
  // What stays declared outside the corpus is the fr/en slug pair in
  // routing.ts, because middleware runs on the edge and cannot read the corpus
  // off disk to translate an address.
  //
  // The four entries around this comment are the axis's real surfaces: a
  // pillar with five routes of its own, a bank rendered from code, a map of
  // sourced events, and a static page.
  {
    // Named for what the corpus actually holds — six sourced events, not a
    // three-millennia timeline (ETNI-1198).
    id: "frise",
    group: "dossiers-populations",
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
    group: "dossiers-organisation",
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
 * What a reader is offered for an access mode: every module of that mode
 * except the ones declared `unlisted`.
 *
 * Availability is still not filtered here, and that half of the old comment
 * stands: the header renders inside PageLayout, a client component some fifty
 * pages mount, so it cannot run the hub's Supabase probe — but the probe only
 * ever answers "is this module's corpus empty", never "does this module
 * exist". A reader following a header link to a module whose table is empty
 * lands on that module's own empty state, which is a smaller failure than a
 * link that was never shown.
 *
 * `unlisted` is a different question and the only one this filter asks: not
 * "is there anything behind the door" but "would a reader ever have come
 * looking for it in a menu". Read by the header *and* by the hub grid
 * (`getHubModules`), because the charter's rule that a page states one
 * availability rather than one per surface applies to being offered at all.
 */
// @req REQ-114 @req REQ-106
export const getNavModules = (mode: AccessMode): HubModuleDefinition[] =>
  getModulesForAccessMode(mode).filter((definition) => !definition.unlisted);

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

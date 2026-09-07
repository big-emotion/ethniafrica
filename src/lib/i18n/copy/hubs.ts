import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import { TRAIL_PAGE_LABELS } from "@/lib/i18n/copy/trail";
import type { Language } from "@/types/shared";

const en = {
  atlas: {
    title: TRAIL_PAGE_LABELS.en.atlasHub,
    pageTitle: "Explore the peoples of Africa",
    blurb:
      "The fiche axis: language families, languages, peoples, countries, ethnonyms and names, each under its own.",
    menuBlurb:
      "The fiches of families, languages, peoples, countries, ethnonyms and names, plus the search.",
    hubEntryName: "The exploration hub",
  },
  dossiers: {
    title: TRAIL_PAGE_LABELS.en.dossiersHub,
    pageTitle: "Understand the peoples of Africa",
    blurb:
      "The relations axis: where a name comes from, where the peoples passed, and which sources the atlas rests on.",
    menuBlurb: "Read by theme, across peoples, territories and eras.",
    hubEntryName: "The reading hub",
    // What the hub says while every long reading is withdrawn. It states the
    // rework and promises the return, and deliberately does not read as a
    // search that found nothing — the reader has done nothing to correct.
    frozenStatus: "The dossiers are being rewritten. They will be back.",
  },
  jeux: {
    title: TRAIL_PAGE_LABELS.en.jeuxHub,
    pageTitle: "Play with the peoples of Africa",
    blurb:
      "The testing axis: games and quizzes drawn from the fiches, each answer leading back to its own.",
    menuBlurb:
      "A quiz drawn from the fiches, and a game on the true size of countries.",
    hubEntryName: "The games hub",
  },
  unavailableLabel: "Coming soon",
  menuLabel: "Three paths",
  facetsLabel: "Its facets",
  moduleNames: {
    pays: "The countries of Africa",
    peuples: "The peoples of Africa",
    familles: "The family tree",
    langues: "The languages of Africa",
    noms: "Ethnonyms",
    patronymes: "Names",
    recherche: "Free search",
    nommer: "Who gave this name?",
    anecdotes: "Anecdotes",
    "dossier-proportions": "True proportions",
    "dossier-populations": "Real weight",
    "dossier-ressources": "A geological scandal",
    "dossier-kongo": "The Kongo kingdom",
    "dossier-luba": "Luba: power and memory",
    "dossier-lunda": "Lunda: alliances and connections",
    "dossier-spiritualites-kongo": "Kongo spiritualities: objects and change",
    frise: "First migration landmarks",
    "regards-colonisation": "Colonial gaze: colonisation and resistance",
    quiz: "The quiz",
    mercator: "The size they hid from you",
  } as Record<string, string>,
};

type HubsCopy = typeof en;

// `blurb` opens the hub page — it says what the axis holds, in the
// register of the page it opens. `menuBlurb` opens the header panel,
// directly above the tiles of that axis, and lists what those tiles are.
// Two surfaces, so two sentences; both copied from docs/design/mockups,
// which is the reference when code and mockup disagree
// (docs/design/README.md).
//
// The panel sentence used to name the occasion instead of the contents —
// « Quand on sait ce qu'on cherche », « Quand on veut se tester » — which
// asks a reader looking straight at five unexplained tiles to work out
// for themselves what those tiles hold. It now names the modules, and
// `modulesNamedIn` keeps it honest as the registry changes.
//
// Each blurb used to open on the reader's own trajectory — « Il arrive
// avec un nom, il repart avec une fiche » — before naming the contents.
// It read as a figure of speech where a hub page owes a description,
// and it was the first sentence of three pages and their three meta
// descriptions. The clause is gone; what the axis actually holds, which
// was already the back half of every one of these, is now the whole of
// it. The home's cards (AccessAxes) carry the same change.
const fr: HubsCopy = {
  atlas: {
    title: ACCESS_MODE_LABELS.atlas,
    // `title` keeps the short reader-facing label available to legacy
    // translation consumers. The band has a different job: it names the
    // page and what it leads into, so `pageTitle` remains descriptive.
    pageTitle: "Explorer les peuples d'Afrique",
    // « Le corpus » and « une entité » are the team's words for the
    // collection and for what it holds. Both name the thing from the
    // inside, and neither is glossed anywhere a reader passes through
    // (ETNI-857) — so the menu that is supposed to say where a click
    // lands was written in the vocabulary of the people who built it.
    // Ordered by the corpus's own hierarchy — famille → langue → peuple →
    // pays — then the two axes that name rather than place. Both sentences
    // listed four of six classes, each omitting a different pair, so a
    // reader met a different atlas depending on whether they read the menu
    // or the page under it.
    blurb:
      "L'axe des fiches : familles linguistiques, langues, peuples, pays, appellations et noms, chacun sous la sienne.",
    menuBlurb:
      "Les fiches de familles, langues, peuples, pays, appellations et noms, plus la recherche.",
    hubEntryName: "Le hub d'exploration",
  },
  dossiers: {
    title: ACCESS_MODE_LABELS.dossiers,
    pageTitle: "Comprendre les peuples d'Afrique",
    blurb:
      "L'axe des relations : d'où vient un nom, par où sont passés les peuples, et sur quelles sources l'atlas s'appuie.",
    menuBlurb:
      "Des lectures par thème, à travers les peuples, les territoires et les époques.",
    hubEntryName: "Le hub de lecture",
    frozenStatus: "Les dossiers sont en cours de réécriture. Ils reviendront.",
  },
  jeux: {
    title: ACCESS_MODE_LABELS.jeux,
    pageTitle: "Jouer avec les peuples d'Afrique",
    blurb:
      "L'axe de la mise à l'épreuve : des jeux et des quiz tirés des fiches, dont chaque réponse renvoie à la sienne.",
    menuBlurb:
      "Un quiz tiré des fiches, et un jeu sur la taille réelle des pays.",
    hubEntryName: "Le hub des jeux",
  },
  unavailableLabel: "Bientôt",
  menuLabel: "Trois chemins",
  // Names the row of facet links under the hub entry. The facets are
  // states of one page, so the menu says so rather than listing them
  // beside the hub as if they were three more destinations — which is
  // exactly how the three directories read before they were merged.
  facetsLabel: "Ses facettes",
  moduleNames: {
    pays: "Les pays d'Afrique",
    peuples: "Les peuples d'Afrique",
    familles: "L'arbre des familles",
    langues: "Les langues d'Afrique",
    noms: "Appellations",
    patronymes: "Noms",
    recherche: "Recherche libre",
    nommer: "Qui a donné ce nom ?",
    anecdotes: "Anecdotes",
    "dossier-proportions": "Les vraies proportions",
    "dossier-populations": "Le poids réel",
    "dossier-ressources": "Un scandale géologique",
    "dossier-kongo": "Le royaume Kongo",
    "dossier-luba": "Luba : pouvoir et mémoire",
    "dossier-lunda": "Lunda : alliances et circulations",
    "dossier-spiritualites-kongo":
      "Spiritualités kongo : objets et transformations",
    frise: "Premiers repères de migrations",
    "regards-colonisation": "Regards : colonisation et résistances",
    quiz: "Le quiz",
    mercator: "La taille qu'on vous a cachée",
  },
};

// @req REQ-145
export const hubsCopy: Record<Language, HubsCopy> = { en, fr };

import {
  ACCESS_MODE_LABELS,
  type ModuleGroupId,
} from "@/lib/hubs/moduleRegistry";
import { TRAIL_PAGE_LABELS } from "@/lib/i18n/copy/trail";
import type { Language } from "@/types/shared";

const en = {
  atlas: {
    title: TRAIL_PAGE_LABELS.en.atlasHub,
    pageTitle: "Explore the peoples of Africa",
    blurb:
      "The fiche axis: language families, languages, peoples, countries and names, each under its own.",
    menuBlurb:
      "The fiches of language families, languages, peoples, countries and names, plus the search.",
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
    // The hub shows one page of readings at a time; these are its controls.
    pager: {
      label: "Pages of dossiers",
      previous: "Previous",
      next: "Next",
      position: (page: number, count: number) => `Page ${page} of ${count}`,
    },
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
  // What the second link of a hub plate's caption says. Brand charter §9 asks
  // for the licence's URI rather than its initials, so the caption needs a
  // word to hang the address on — the initials stay in the credit line beside
  // it, where they name the terms this links to.
  plateLicenceLabel: "Licence",
  menuLabel: "Three paths",
  facetsLabel: "Its facets",
  moduleNames: {
    pays: "The countries of Africa",
    peuples: "The peoples of Africa",
    familles: "The language families",
    langues: "The languages of Africa",
    // Unlisted, not retired — the header no longer renders it. Kept so the
    // label stays a decision rather than a fallback to the registry's.
    noms: "Ethnonyms",
    patronymes: "The names of Africa",
    recherche: "Free search",
    nommer: "Who gave this name?",
    anecdotes: "Anecdotes",
    frise: "First migration landmarks",
    "regards-colonisation": "Colonial gaze: colonisation and resistance",
    quiz: "The quiz",
    mercator: "The size they hid from you",
  } as Record<string, string>,
  // What the reader reads over a rubric of dossiers. One domain noun each,
  // taken from the vocabulary the country fiche already teaches — `country.ts`
  // renders Religions · Economy · Organisation · Relations over its culture
  // block — so a reader who has read one fiche has met these words before.
  //
  // Phrases were tried first and rejected in review: « Ce qu'on mesure » and
  // « Pouvoirs et territoires » read as sentences where the surface needs a
  // label, and a heading that is a sentence competes with the dossier titles
  // under it instead of filing them.
  moduleGroupNames: {
    "dossiers-noms": "Names",
    "dossiers-organisation": "Organisation",
    "dossiers-religions": "Religions",
    "dossiers-territoires": "Territories",
    "dossiers-populations": "Populations",
    "dossiers-economie": "Economy",
    "jeux-pays": "Countries",
    "jeux-quiz": "The quiz",
  } satisfies Record<ModuleGroupId, string>,
  // Closes a rubric that holds more readings than the menu lists. It counts
  // what is *not* shown rather than the whole rubric: "+ 96 more" beside four
  // cards is a promise of ninety-six unseen readings, where "100 dossiers"
  // beside them would have the reader wondering which four of the hundred
  // these are.
  moreInRubric: (count: number) =>
    count === 1 ? "+ 1 more" : `+ ${count} more`,
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
    // pays — then the axis that names rather than places. Both sentences once
    // listed four of six classes, each omitting a different pair, so a
    // reader met a different atlas depending on whether they read the menu
    // or the page under it.
    //
    // They now name five, not six: appellations left the menu on 7 September
    // 2026 (atlas-charter.md §3), and a sentence that promises what the row
    // below it does not offer is the same defect in the other direction.
    blurb:
      "L'axe des fiches : familles linguistiques, langues, peuples, pays et noms, chacun sous la sienne.",
    menuBlurb:
      "Les fiches de familles linguistiques, langues, peuples, pays et noms, plus la recherche.",
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
    pager: {
      label: "Pages de dossiers",
      previous: "Précédent",
      next: "Suivant",
      position: (page: number, count: number) => `Page ${page} sur ${count}`,
    },
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
  plateLicenceLabel: "Licence",
  menuLabel: "Trois chemins",
  // Names the row of facet links under the hub entry. The facets are
  // states of one page, so the menu says so rather than listing them
  // beside the hub as if they were three more destinations — which is
  // exactly how the three directories read before they were merged.
  facetsLabel: "Ses facettes",
  moduleNames: {
    pays: "Les pays d'Afrique",
    peuples: "Les peuples d'Afrique",
    familles: "Les familles linguistiques",
    langues: "Les langues d'Afrique",
    // Kept although the header no longer renders it: the entry is unlisted,
    // not retired, and a label deleted here would fall back to the registry's
    // — which is the same string, but by accident rather than by decision.
    noms: "Appellations",
    patronymes: "Les noms d'Afrique",
    recherche: "Recherche libre",
    nommer: "Qui a donné ce nom ?",
    anecdotes: "Anecdotes",
    frise: "Premiers repères de migrations",
    "regards-colonisation": "Regards : colonisation et résistances",
    quiz: "Le quiz",
    mercator: "La taille qu'on vous a cachée",
  },
  moduleGroupNames: {
    "dossiers-noms": "Noms",
    "dossiers-organisation": "Organisation",
    "dossiers-religions": "Religions",
    "dossiers-territoires": "Territoires",
    "dossiers-populations": "Populations",
    "dossiers-economie": "Économie",
    "jeux-pays": "Les pays",
    "jeux-quiz": "Le quiz",
  },
  moreInRubric: (count: number) =>
    count === 1 ? "+ 1 autre" : `+ ${count} autres`,
};

// @req REQ-145
export const hubsCopy: Record<Language, HubsCopy> = { en, fr };

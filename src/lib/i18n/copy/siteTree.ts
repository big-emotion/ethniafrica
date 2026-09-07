import type { Language } from "@/types/shared";

const en = {
  home: {
    title: "Home",
    blurb:
      "The atlas opens with intent, not a table of contents: search, understand or play unfolds its modules on the home page itself, and the next click opens the module.",
    label: "Home",
    note: "The globe and the three paths.",
  },
  corpus: {
    title: "The corpus, in AFRIK order",
    // The rubric's own hub. Named for the axis rather than described, because
    // the rubric's blurb above already says what the axis holds.
    hub: ["The atlas", "The axis and its six ways in."],
    blurb:
      "Language family → language → people → country. This is the hierarchy of the corpus itself, and each fiche can be read from the level above. Designations and personal names cross it: they name, they do not locate.",
    families: [
      "Language families",
      "The first level: 24 families, each with its languages.",
    ],
    languages: [
      "Languages",
      "748 languages, each attached to its language family.",
    ],
    peoples: ["Peoples", "789 fiches, attached to their family and countries."],
    countries: [
      "Countries",
      "54 fiches, each listing the peoples who live there.",
    ],
    names: [
      "Personal names",
      "30 personal naming systems, distinct from the designations of a people.",
    ],
    search: [
      "Free search",
      "When you know what you are looking for, but not where to find it.",
    ],
    compare: ["Compare", "Place two entities of the same type side by side."],
  },
  dossiers: {
    title: "Dossiers",
    blurb:
      "Where a name comes from, where a people comes from, and who says so. The three questions, in that order.",
    all: "All dossiers",
    nommerTitle: "Who gave this name?",
    nommerNote: "The founding dossier and its five chapters.",
    names: [
      "Designations",
      "Autonyms, exonyms, and what the gap between them tells us.",
    ],
    migrations: [
      "First migration landmarks",
      "Six sourced events, not a timeline spanning three millennia.",
    ],
    colonization: "Perspectives: colonisation and resistance",
    doctrine: [
      "Editorial doctrine",
      "How a source is weighed and a fiche published.",
    ],
  },
  play: {
    title: "Play",
    hub: ["Play", "The axis and its rounds."],
    blurb:
      "Every round is drawn from the corpus: winning means having learnt something, never having guessed.",
    quiz: "The quiz",
  },
  contribute: {
    title: "Contribute",
    blurb:
      "The corpus is open and incomplete, and says so. These are the two ways to correct it.",
    contribution: ["Contribute", "Propose a fiche, a source or a correction."],
    reports: ["Reports", "Reported errors and their public resolution."],
  },
  site: {
    title: "The site",
    blurb: "Who publishes it, under which rules, and how to read the data.",
    about: "About",
    glossary: ["Glossary", "The words the atlas uses to name, defined once."],
    sources: ["Sources", "The bibliography documenting the corpus."],
    api: ["Public API v2", "The corpus as JSON, under an open licence."],
    contact: ["Contact", "Write to the team publishing the atlas."],
    accessibility: "Accessibility",
    legal: "Legal notice",
    data: "Data policy",
    sitemap: "Sitemap",
  },
};

type SiteTreeCopy = typeof en;

const fr: SiteTreeCopy = {
  home: {
    title: "L'accueil",
    blurb:
      "L'atlas s'ouvre par l'intention, pas par le sommaire : chercher, comprendre ou jouer déplie ses modules sur l'accueil même, et le clic suivant est le module.",
    label: "Accueil",
    note: "Le globe et les trois axes.",
  },
  corpus: {
    title: "Le corpus, dans l'ordre AFRIK",
    hub: ["L'atlas", "L'axe et ses six entrées."],
    blurb:
      "Famille linguistique → langue → peuple → pays. C'est la hiérarchie du corpus lui-même, et chaque fiche se lit depuis celle du dessus. Les appellations et les noms la traversent : ils nomment, ils ne situent pas.",
    families: [
      "Familles linguistiques",
      "Le premier niveau : 24 familles, chacune avec ses langues.",
    ],
    languages: [
      "Langues",
      "748 langues, chacune rattachée à sa famille linguistique.",
    ],
    peoples: [
      "Peuples",
      "789 fiches, rattachées à leur famille et à leurs pays.",
    ],
    countries: [
      "Pays",
      "54 fiches, chacune listant les peuples qui l'habitent.",
    ],
    names: [
      "Noms",
      "30 systèmes de nommage des personnes, distincts des appellations d'un peuple.",
    ],
    search: [
      "Recherche libre",
      "Quand on sait ce qu'on cherche et pas où le trouver.",
    ],
    compare: ["Comparer", "Mettre deux entités du même type côte à côte."],
  },
  dossiers: {
    title: "Les dossiers",
    blurb:
      "D'où vient ce nom, d'où vient ce peuple, et qui l'affirme. Les trois questions dans cet ordre.",
    all: "Tous les dossiers",
    nommerTitle: "Qui a donné ce nom ?",
    nommerNote: "Le dossier fondateur, et ses cinq chapitres.",
    names: ["Appellations", "Autonymes, exonymes, et ce que l'écart raconte."],
    migrations: [
      "Premiers repères de migrations",
      "Six événements sourcés, pas une frise de trois millénaires.",
    ],
    colonization: "Regards : colonisation et résistances",
    doctrine: [
      "La doctrine éditoriale",
      "Comment une source est pesée et une fiche publiée.",
    ],
  },
  play: {
    title: "Jouer",
    hub: ["Jouer", "L'axe et ses parties."],
    blurb:
      "Chaque partie est tirée du corpus : gagner suppose d'avoir lu quelque chose, jamais d'avoir deviné.",
    quiz: "Le quiz",
  },
  contribute: {
    title: "Participer",
    blurb:
      "Le corpus est ouvert et incomplet, et il le dit. Les deux portes par lesquelles on le corrige.",
    contribution: [
      "Contribuer",
      "Proposer une fiche, une source, une correction.",
    ],
    reports: [
      "Signalements",
      "Les erreurs signalées et leur traitement, en public.",
    ],
  },
  site: {
    title: "Le site",
    blurb: "Qui publie, sous quelles règles, et comment lire les données.",
    about: "À propos",
    glossary: [
      "Glossaire",
      "Les mots avec lesquels l'atlas nomme, définis une fois.",
    ],
    sources: ["Sources", "La bibliographie qui documente le corpus."],
    api: ["API publique v2", "Le corpus en JSON, sous licence ouverte."],
    contact: ["Contact", "Écrire à l'équipe qui publie l'atlas."],
    accessibility: "Accessibilité",
    legal: "Mentions légales",
    data: "Politique de données",
    sitemap: "Plan du site",
  },
};

// @req REQ-145
export const siteTreeCopy: Record<Language, SiteTreeCopy> = { en, fr };

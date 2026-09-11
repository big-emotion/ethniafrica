import type { AccessMode } from "@/lib/hubs/moduleRegistry";
import type { Language } from "@/types/shared";

/**
 * The About page's three access-mode cards, in both locales (REQ-145).
 *
 * **A slice, not the whole surface.** `AboutPageContent` still holds its own
 * copy inline, which predates `check:copy-literals` and is grandfathered by
 * the gate's diff against the previous file. These three descriptions moved
 * out because they had to change — the Mercator game was renamed, and the
 * page's own contract (REQ-132, `AboutPageContent.test.tsx`) is that each card
 * names the modules sitting behind it, so a renamed module makes the sentence
 * wrong. Touching a French literal there is what the gate refuses, and it is
 * right: this is reader-facing copy.
 *
 * The rest of that file is the next slice's work, not this change's.
 */

export interface AccessModeCardCopy {
  id: AccessMode;
  label: string;
  description: string;
  accentClass: string;
}

/**
 * The accent each axis carries, per the atlas charter's one-accent-per-surface
 * rule. Declared alongside the copy because a card is the pair.
 */
const ACCENT_CLASS: Record<AccessMode, string> = {
  atlas: "afh-accent-ocre",
  dossiers: "afh-accent-teal",
  jeux: "afh-accent-perv",
};

// @req REQ-132
// @req REQ-145
export const accessModeCards: Record<Language, AccessModeCardCopy[]> = {
  en: [
    {
      id: "atlas",
      label: "The atlas",
      description:
        "Everything the atlas holds: families, languages, peoples, countries and names, plus free search.",
      accentClass: ACCENT_CLASS.atlas,
    },
    {
      id: "dossiers",
      label: "Dossiers",
      description:
        "Sourced anecdotes, initial migration landmarks and a dossier on colonisation.",
      accentClass: ACCENT_CLASS.dossiers,
    },
    {
      id: "jeux",
      label: "Play",
      description:
        "A quiz drawn from the atlas, and the Mercator projection cut down to size.",
      accentClass: ACCENT_CLASS.jeux,
    },
  ],
  fr: [
    {
      id: "atlas",
      label: "L'atlas",
      description:
        "Tout ce que l’atlas contient : familles de langues, langues, peuples, pays et noms, plus la recherche libre.",
      accentClass: ACCENT_CLASS.atlas,
    },
    {
      id: "dossiers",
      label: "Les dossiers",
      description:
        "Des anecdotes sourcées, les premiers repères de migrations et un dossier sur la colonisation.",
      accentClass: ACCENT_CLASS.dossiers,
    },
    {
      id: "jeux",
      label: "Jouer",
      description:
        "Un quiz tiré de l’atlas, et la projection de Mercator remise à sa juste taille.",
      accentClass: ACCENT_CLASS.jeux,
    },
  ],
};

export interface PurposeScaleCopy {
  title: string;
  body: string;
}

export interface PurposeChapterCopy {
  stepLabel: string;
  title: string;
  claim: string;
  claimStatus: string;
  scales: PurposeScaleCopy[];
  closing: string;
}

/**
 * The chapter that answers "what is this for", and the reason it exists.
 *
 * A reader wrote to the project on 9 September 2026 that its goal was not
 * perceptible: the page listed what the corpus holds and never said what it
 * sets out to change. A statement of contents is not a statement of intent,
 * so this chapter opens the page and the other two shift down.
 *
 * `claimStatus` is not decoration. The claim is editorial emphasis, not a
 * finding the corpus establishes, and an atlas whose product is provenance
 * cannot print it unlabelled — the same doctrine as the Source Tier policy,
 * one layer up: nothing is forbidden, everything is labelled.
 *
 * The figures were re-measured from `content.demography.distributionByCountry`
 * on 11 September 2026, macro-groups excluded, and `closing` states that date
 * because the corpus moves and a number printed as a constant would drift.
 */
// @req REQ-132
// @req REQ-145
export const purposeChapter: Record<Language, PurposeChapterCopy> = {
  en: {
    stepLabel: "01 · Purpose",
    title: "What this atlas sets out to change",
    claim: "This people was not divided. The map was drawn over it.",
    claimStatus:
      "That is what we think, not a fact the atlas proves. Here is what it rests on.",
    scales: [
      {
        title: "For a people",
        body: "It leads with the name it gives itself. The name others give it comes after. And if we get it wrong, anyone can tell us.",
      },
      {
        title: "For a country",
        body: "A country is not a flag. It is the list of those who live there. Tanzania counts 95, Ethiopia 82, Ghana 80.",
      },
      {
        title: "For a diaspora",
        body: "For the Soninke, the Kabyles and the Comorians, France is already on the list of their countries. We are not talking about somewhere else.",
      },
    ],
    closing:
      "Africa’s borders are a hundred and forty years old. Berlin, 1884. Independence, 1960. What they cut across is far older: 191 peoples live today in three countries or more. The Fula in twelve. The Soninke in eleven. Counted on 11 September 2026.",
  },
  fr: {
    stepLabel: "01 · Le propos",
    title: "Ce que cet atlas veut changer",
    claim:
      "Ce peuple n’a pas été divisé. C’est la carte qui a été dessinée par-dessus.",
    claimStatus:
      "C’est ce que nous pensons, pas un fait que l’atlas démontre. Voici sur quoi ça repose.",
    scales: [
      {
        title: "Pour un peuple",
        body: "Il porte d’abord le nom qu’il se donne. Celui que les autres lui donnent vient après. Et si on se trompe, n’importe qui peut nous le dire.",
      },
      {
        title: "Pour un pays",
        body: "Un pays, ce n’est pas un drapeau. C’est la liste de ceux qui y vivent. La Tanzanie en compte 95, l’Éthiopie 82, le Ghana 80.",
      },
      {
        title: "Pour une diaspora",
        body: "Pour les Soninké, les Kabyles et les Comoriens, la France est déjà dans la liste de leurs pays. On ne parle pas d’un ailleurs.",
      },
    ],
    closing:
      "Les frontières de l’Afrique ont cent quarante ans. Berlin, 1884. Les indépendances, 1960. Ce qu’elles coupent est bien plus vieux : 191 peuples vivent aujourd’hui dans trois pays ou plus. Les Peul dans douze. Les Soninké dans onze. Compté le 11 septembre 2026.",
  },
};

/**
 * The step label each of the two later chapters wears.
 *
 * They live here because inserting a chapter renumbers every one below it,
 * and a number spelled in two locales inside a component is exactly the
 * literal the copy gate refuses to see change.
 */
// @req REQ-132
// @req REQ-145
export const chapterSteps: Record<
  Language,
  { corpus: string; accessModes: string }
> = {
  en: { corpus: "02 · Contents", accessModes: "03 · Ways in" },
  fr: { corpus: "02 · Le contenu", accessModes: "03 · Les accès" },
};

export interface SubjectCopy {
  description: string;
  linkLabel: string;
}

export interface AboutPageCopy {
  title: string;
  overview: {
    eyebrow: string;
    lead: string;
    asideLead: string;
    asideNote: string;
    doctrineLinkLabel: string;
  };
  contents: {
    title: string;
    intro: string;
    subjects: Record<string, SubjectCopy>;
  };
  accessModes: { title: string; intro: string };
}

/**
 * The About page's own words.
 *
 * Rewritten on 11 September 2026 against the plain-language doctrine the
 * project already applies to its social cards. Two rules did most of the work.
 *
 * **The reader does not know what a "fiche" is.** It is a workshop word, and
 * so is "corpus". Both are gone from this surface: a people has a page, and
 * the thing that holds them all is the atlas. Nothing about the vocabulary was
 * load-bearing — it was the workshop talking to itself in front of a visitor.
 *
 * **Scholarly words subtract readers from a sourced fact, they do not add
 * rigour to it.** So "autonyme" becomes the name a people gives itself, and
 * "exonyme" the name others give it. The figures, the dates and the proper
 * names all stay: it is the abstraction that goes, never the precision.
 *
 * The link to the editorial doctrine says what the page is for rather than
 * repeating its title, which is a scholarly phrase a visitor will not open.
 */
// @req REQ-132
// @req REQ-145
export const aboutPage: Record<Language, AboutPageCopy> = {
  en: {
    title: "About",
    overview: {
      eyebrow: "The project",
      lead: "EthniAfrica tells the story of Africa’s peoples: where they live, the languages they speak, and where their names come from.",
      asideLead:
        "Everything written here comes from a source, and the source is shown.",
      asideNote:
        "When we do not know, that is written too. Our rules are here:",
      doctrineLinkLabel: "how we write",
    },
    contents: {
      title: "What you will find",
      intro: "Six subjects. Each one points to the others.",
      subjects: {
        peoples: {
          description:
            "Who they are, where they live, and the names they are given.",
          linkLabel: "See the peoples",
        },
        languages: {
          description:
            "Every language has its page, linked to the peoples who speak it.",
          linkLabel: "See the languages",
        },
        families: {
          description:
            "Related languages, grouped. A family of languages is not a people.",
          linkLabel: "See the families",
        },
        countries: {
          description:
            "The peoples who live there, and the story of the country’s name.",
          linkLabel: "See the countries",
        },
        names: {
          description:
            "The name a people gives itself, and the name others give it.",
          linkLabel: "See the names of peoples",
        },
        patronymes: {
          description:
            "Family names, and where they come from. They do not all work the way European ones do.",
          linkLabel: "See the family names",
        },
      },
    },
    accessModes: {
      title: "Three ways in",
      intro: "Look something up, read a story, or play.",
    },
  },
  fr: {
    title: "À propos",
    overview: {
      eyebrow: "Le projet",
      lead: "EthniAfrica raconte les peuples d’Afrique : où ils vivent, quelles langues ils parlent, et d’où viennent leurs noms.",
      asideLead:
        "Tout ce qui est écrit ici vient d’une source, et la source est affichée.",
      asideNote:
        "Quand on ne sait pas, c’est écrit aussi. Nos règles sont ici :",
      doctrineLinkLabel: "comment on écrit",
    },
    contents: {
      title: "Ce qu’on y trouve",
      intro: "Six sujets. Chacun renvoie vers les autres.",
      subjects: {
        peoples: {
          description:
            "Qui ils sont, où ils vivent, et les noms qu’on leur donne.",
          linkLabel: "Voir les peuples",
        },
        languages: {
          description:
            "Chaque langue a sa page, reliée aux peuples qui la parlent.",
          linkLabel: "Voir les langues",
        },
        families: {
          description:
            "Des langues parentes, regroupées. Une famille de langues n’est pas un peuple.",
          linkLabel: "Voir les familles",
        },
        countries: {
          description:
            "Les peuples qui y vivent, et l’histoire du nom du pays.",
          linkLabel: "Voir les pays",
        },
        names: {
          description:
            "Le nom qu’un peuple se donne, et celui que les autres lui donnent.",
          linkLabel: "Voir les noms de peuples",
        },
        patronymes: {
          description:
            "Les noms de famille, et d’où ils viennent. Ils ne marchent pas tous comme en Europe.",
          linkLabel: "Voir les noms de famille",
        },
      },
    },
    accessModes: {
      title: "Trois manières d’entrer",
      intro: "Chercher quelque chose de précis, lire une histoire, ou jouer.",
    },
  },
};

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
        "The site's fiches: families, languages, peoples, countries, designations and names, plus free search.",
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
        "A quiz drawn from the fiches, and the Mercator projection cut down to size.",
      accentClass: ACCENT_CLASS.jeux,
    },
  ],
  fr: [
    {
      id: "atlas",
      label: "L'atlas",
      description:
        "Les fiches du site : familles linguistiques, langues, peuples, pays et noms, plus la recherche libre.",
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
        "Un quiz tiré des fiches, et la projection de Mercator remise à sa juste taille.",
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
      "That sentence is EthniAfrica’s position. The corpus does not establish it; it carries what the position rests on, and that follows here.",
    scales: [
      {
        title: "For a people",
        body: "Every fiche leads with the name a people gives itself. The name others gave it follows, with its context, and is never quietly dropped. Any fiche accepts a correction report from the people it describes.",
      },
      {
        title: "For a country",
        body: "A country fiche lists those who live there rather than summarising a nation. Tanzania documents 95 of them, Ethiopia 82, Ghana 80, Côte d’Ivoire and Nigeria 68 each.",
      },
      {
        title: "For a diaspora",
        body: "The corpus already counts France among the countries of distribution for the Soninke, the Kabyles and the Comorians. The atlas does not point its readers somewhere else.",
      },
    ],
    closing:
      "A colonial border is a hundred and forty years old: the Berlin conference opens in 1884, and most independences date from 1960. The belongings those lines cut across are older, and 191 peoples in the corpus live today in three countries or more — the Fula in twelve, the Soninke in eleven. Measured on 11 September 2026, macro-groups excluded.",
  },
  fr: {
    stepLabel: "01 · Le propos",
    title: "Ce que cet atlas veut changer",
    claim:
      "Ce peuple n’a pas été divisé. C’est la carte qui a été dessinée par-dessus.",
    claimStatus:
      "Cette phrase est la position d’EthniAfrica. Le corpus ne l’établit pas ; il en porte les éléments, et les voici.",
    scales: [
      {
        title: "Pour un peuple",
        body: "Chaque fiche porte d’abord le nom que le peuple se donne. Le nom que d’autres lui ont donné vient ensuite, avec son contexte, et n’est jamais supprimé en silence. Toute fiche accepte un signalement de la part de ceux qu’elle décrit.",
      },
      {
        title: "Pour un pays",
        body: "Une fiche pays énumère ceux qui l’habitent plutôt qu’elle ne résume une nation. La Tanzanie en documente 95, l’Éthiopie 82, le Ghana 80, la Côte d’Ivoire et le Nigeria 68 chacun.",
      },
      {
        title: "Pour une diaspora",
        body: "Le corpus compte déjà la France parmi les pays de répartition des Soninké, des Kabyles et des Comoriens. L’atlas ne renvoie pas ses lecteurs vers un ailleurs.",
      },
    ],
    closing:
      "Un tracé colonial a cent quarante ans : la conférence de Berlin s’ouvre en 1884, et la plupart des indépendances datent de 1960. Les appartenances que ces lignes coupent sont plus anciennes, et 191 peuples du corpus vivent aujourd’hui dans trois pays ou plus — les Peul dans douze, les Soninké dans onze. Relevé du 11 septembre 2026, macro-groupes exclus.",
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
  en: { corpus: "02 · The corpus", accessModes: "03 · Ways in" },
  fr: { corpus: "02 · Le corpus", accessModes: "03 · Les accès" },
};

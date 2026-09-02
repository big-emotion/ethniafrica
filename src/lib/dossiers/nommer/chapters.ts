/**
 * The five chapters of « Qui a donné ce nom ? », in reading order.
 *
 * Declaration order is reading order: the pillar's tile grid, each chapter's
 * previous/next, and the "les autres chapitres" grid at the foot of a chapter
 * are all derived from this array. Declaring the sequence twice is how the
 * two would come to disagree.
 *
 * Prose lives here rather than in a table for the same reason the anecdotes
 * bank does: the page renders from a constant and cannot show a reader an
 * empty dossier because a database was slow. Nothing here needs a migration.
 *
 * The five chapters are the five things a name is given to — a people, a
 * country, a person, a language, a thing. That is the whole taxonomy, and it
 * is why there are five rather than a round number: each one is a different
 * régime of naming, and the last one exists because the first four would
 * otherwise leave a reader thinking the question is only about people.
 */

import type { NommerChapterKey } from "@/lib/routing";

import type { DossierChapter } from "./types";

// @req REQ-113
export const NOMMER_CHAPTERS: DossierChapter[] = [
  {
    key: "le-peuple",
    ordinal: "01",
    title: "Le peuple",
    question:
      "Presque tous les peuples de l'atlas portent un nom venu du dehors. Qui le leur a donné ?",
    standfirst: {
      text: "Le corpus tient plus de noms donnés de l'extérieur que de noms revendiqués de l'intérieur. L'écart ne mesure pas d'abord la colonisation : il mesure qui a écrit.",
      sourceRefs: [],
      figureRefs: ["corpus-exonyms", "corpus-autonyms"],
    },
    measure: {
      value: "3 207",
      unit: "exonymes recensés",
      sourceRefs: [],
      figureRefs: ["corpus-exonyms"],
    },
    sections: [],
    entities: [
      { kind: "people", id: "PPL_DINKA", label: "Dinka" },
      { kind: "people", id: "PPL_HERERO", label: "Herero" },
    ],
  },
  {
    key: "le-pays",
    ordinal: "02",
    title: "Le pays",
    question:
      "Les frontières viennent de Berlin. Et les noms qu'on a posés dessus, d'où viennent-ils ?",
    standfirst: {
      text: "Moins d'un tiers des pays du continent portent un nom que des Africains ont choisi. Renommer n'a pas été un moment : c'est une pratique qui court sur soixante ans.",
      sourceRefs: [],
      figureRefs: ["countries-african-choice", "corpus-countries"],
    },
    measure: {
      value: "17 sur 54",
      unit: "noms choisis par des Africains",
      sourceRefs: [],
      figureRefs: ["countries-african-choice", "corpus-countries"],
    },
    sections: [],
    entities: [
      { kind: "country", id: "NGA", label: "Nigeria" },
      { kind: "country", id: "BEN", label: "Bénin" },
      { kind: "country", id: "GHA", label: "Ghana" },
    ],
  },
  {
    key: "la-personne",
    ordinal: "03",
    title: "La personne",
    question:
      "Le nom de famille se transmet, croit-on, depuis toujours. Depuis quand, exactement ?",
    standfirst: {
      text: "Le nom de famille héréditaire n'est pas une survivance : c'est un artefact administratif. Le corpus documente des systèmes entiers où le nom ne se transmet pas.",
      sourceRefs: ["afrik-naming-taxonomy"],
      figureRefs: ["patronyme-non-hereditary", "patronyme-fiches"],
    },
    measure: {
      value: "4 systèmes",
      unit: "où le nom ne se transmet pas",
      sourceRefs: [],
      figureRefs: ["patronyme-non-hereditary"],
    },
    sections: [],
    entities: [],
  },
  {
    key: "la-langue",
    ordinal: "04",
    title: "La langue",
    question:
      "Le mot « bantou » range huit cents peuples. Qui l'a forgé, et pour quoi faire ?",
    standfirst: {
      text: "Une étiquette née dans un bureau colonial classe aujourd'hui la plus grande famille linguistique du continent. Elle est scientifiquement utile et politiquement toxique, et l'atlas continue de l'employer.",
      sourceRefs: ["bleek-1862", "britannica-bleek"],
      figureRefs: ["corpus-language-families"],
    },
    measure: {
      value: "« bantou », 1862",
      unit: "première attestation",
      sourceRefs: ["bleek-1862"],
      figureRefs: [],
    },
    sections: [],
    entities: [],
  },
  {
    key: "la-chose",
    ordinal: "05",
    title: "La chose",
    question:
      "Le wax, le café, le cacao, Mami Wata : lesquels sont africains, et en quel sens ?",
    standfirst: {
      text: "Cinq objets qu'on dit africains, cinq trajectoires différentes. Aucune de ces cases ne s'appelle « inauthentique » — et c'est la démonstration du chapitre.",
      sourceRefs: [],
      figureRefs: [],
    },
    // Written out rather than in digits, and not for typography: the count is
    // a fact about this chapter, not about the corpus, so it has no figure to
    // cite and must not look like it does.
    measure: {
      value: "Cinq trajectoires",
      unit: "cinq verdicts différents",
      sourceRefs: [],
      figureRefs: [],
    },
    sections: [],
    entities: [],
  },
];

// @req REQ-113
export const getNommerChapter = (
  key: NommerChapterKey
): DossierChapter | undefined =>
  NOMMER_CHAPTERS.find((chapter) => chapter.key === key);

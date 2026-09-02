/**
 * The five chapters of « Qui a donné ce nom ? », in reading order.
 *
 * Declaration order is reading order: the pillar's tile grid, each chapter's
 * ordinal, and the "les autres chapitres" grid at the foot of a chapter are
 * all derived from this array. Declaring the sequence twice is how the two
 * would come to disagree.
 *
 * One file per chapter, because a chapter is a thousand words and five of
 * them in one module would be four thousand lines nobody edits with
 * confidence. Prose lives in TypeScript rather than in a table for the same
 * reason the anecdotes bank does: the page renders from a constant and cannot
 * show a reader an empty dossier because a database was slow, and nothing
 * here needs a migration.
 *
 * The five are the five things a name is given to — a people, a country, a
 * person, a language, a thing. That is the whole taxonomy, and it is why
 * there are five rather than a round number: each is a different régime of
 * naming, and the last exists because the first four would otherwise leave a
 * reader thinking the question only concerns peoples.
 */

import type { NommerChapterKey } from "@/lib/routing";

import type { DossierChapter } from "../types";

import { CHAPITRE_LA_CHOSE } from "./laChose";
import { CHAPITRE_LA_LANGUE } from "./laLangue";
import { CHAPITRE_LA_PERSONNE } from "./laPersonne";
import { CHAPITRE_LE_PAYS } from "./lePays";
import { CHAPITRE_LE_PEUPLE } from "./lePeuple";

// @req REQ-113
export const NOMMER_CHAPTERS: DossierChapter[] = [
  CHAPITRE_LE_PEUPLE,
  CHAPITRE_LE_PAYS,
  CHAPITRE_LA_PERSONNE,
  CHAPITRE_LA_LANGUE,
  CHAPITRE_LA_CHOSE,
];

// @req REQ-113
export const getNommerChapter = (
  key: NommerChapterKey
): DossierChapter | undefined =>
  NOMMER_CHAPTERS.find((chapter) => chapter.key === key);

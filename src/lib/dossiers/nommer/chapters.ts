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
 */

import type { NommerChapterKey } from "@/lib/routing";

import type { DossierChapter } from "./types";

// @req REQ-113
export const NOMMER_CHAPTERS: DossierChapter[] = [];

// @req REQ-113
export const getNommerChapter = (
  key: NommerChapterKey
): DossierChapter | undefined =>
  NOMMER_CHAPTERS.find((chapter) => chapter.key === key);

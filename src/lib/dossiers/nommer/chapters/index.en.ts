/**
 * The English sidecars of the five Nommer chapters, keyed by chapter.
 *
 * A record rather than an array: the French `NOMMER_CHAPTERS` owns reading
 * order, and a second ordered list is how the tile grid and the English
 * titles would one day disagree. The wiring PR looks a chapter's sidecar up
 * by the key the French record already carries, so titles, questions and
 * standfirsts — everything a tile shows before the reader has read a word —
 * come from the same object as the prose they lead into.
 *
 * Nothing in `src/components` imports this yet; the foundation PR widens
 * `Language` first and the wiring PR mounts the lookup afterwards.
 */

import type { NommerChapterKey } from "@/lib/routing";

import type { DossierChapterTranslation } from "../types";

import { CHAPITRE_LA_CHOSE_EN } from "./laChose.en";
import { CHAPITRE_LA_LANGUE_EN } from "./laLangue.en";
import { CHAPITRE_LA_PERSONNE_EN } from "./laPersonne.en";
import { CHAPITRE_LE_PAYS_EN } from "./lePays.en";
import { CHAPITRE_LE_PEUPLE_EN } from "./lePeuple.en";

// @req REQ-145
export const NOMMER_CHAPTERS_EN: Readonly<
  Record<NommerChapterKey, DossierChapterTranslation>
> = {
  "le-peuple": CHAPITRE_LE_PEUPLE_EN,
  "le-pays": CHAPITRE_LE_PAYS_EN,
  "la-personne": CHAPITRE_LA_PERSONNE_EN,
  "la-langue": CHAPITRE_LA_LANGUE_EN,
  "la-chose": CHAPITRE_LA_CHOSE_EN,
};

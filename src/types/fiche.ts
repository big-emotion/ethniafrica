/**
 * What kind of thing a fiche is about.
 *
 * The AFRIK entities that get a fiche of their own. This file used to
 * also hold the FichePanel contract (Epic 15 · Story 15.1) — the size, side,
 * source-line and data shapes every chapter composed against. The chapter
 * engine is retired: every fiche is one globe and one parchment, so the
 * only thing left that every fiche shares is which entity it is about.
 *
 * `language` (ETNI-1507) is the one fiche with no globe: `LanguageDetail`
 * carries no per-country distribution to draw, only a family, a set of
 * speaking peoples and a vitality status, so its route hands `FicheSequence`
 * no `globe` prop at all rather than fabricate one.
 */
export type FicheEntityType =
  | "people"
  | "country"
  | "language-family"
  | "language";

/**
 * What kind of thing a fiche is about.
 *
 * The three AFRIK entities that get a fiche of their own. This file used to
 * also hold the FichePanel contract (Epic 15 · Story 15.1) — the size, side,
 * source-line and data shapes every chapter composed against. The chapter
 * engine is retired: all three fiches are one globe and one parchment, so the
 * only thing left that every fiche shares is which entity it is about.
 */
export type FicheEntityType = "people" | "country" | "language-family";

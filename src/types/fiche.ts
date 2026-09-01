/**
 * What kind of thing a fiche is about.
 *
 * The three AFRIK entities that get a fiche of their own, plus `name`
 * (REQ-133): a patronyme fiche reads the same parchment shell but is not
 * itself a cartographic subject, so it carries no globe (FicheSequence's
 * `globe` prop is optional for exactly this case). This file used to
 * also hold the FichePanel contract (Epic 15 · Story 15.1) — the size, side,
 * source-line and data shapes every chapter composed against. The chapter
 * engine is retired: all three original fiches are one globe and one
 * parchment, so the only thing left that every fiche shares is which entity
 * it is about.
 */
export type FicheEntityType = "people" | "country" | "language-family" | "name";

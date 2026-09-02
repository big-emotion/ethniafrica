/**
 * What kind of thing a fiche is about.
 *
 * The AFRIK entities that get a fiche of their own. This file used to
 * also hold the FichePanel contract (Epic 15 · Story 15.1) — the size, side,
 * source-line and data shapes every chapter composed against. The chapter
 * engine is retired: every fiche is one globe and one parchment, so the
 * only thing left that every fiche shares is which entity it is about.
 *
 * `language` (ETNI-1507) and `name` (REQ-133) are the fiches with no globe:
 * `LanguageDetail` carries no per-country distribution to draw, only a family,
 * a set of speaking peoples and a vitality status, and a patronyme fiche reads
 * the same parchment shell but is not itself a cartographic subject. Their
 * routes hand `FicheSequence` no `globe` prop at all rather than fabricate one
 * (the `globe` prop is optional for exactly this case).
 */
export type FicheEntityType =
  "people" | "country" | "language-family" | "language" | "name";

import type { SourceKind, SourceTier } from "@/types/sources";

/**
 * A dossier is the one AFRIK entity that argues rather than describes.
 *
 * Every other fiche states what the corpus holds about a thing. A dossier
 * states what a body of published measurement says about a subject, and what
 * that measurement leaves out — so its atomic unit is not a field but a pair
 * of readings of the same fact. `DossierReading` is where that lives, and
 * `DOSSIER_READING_STANCES` is why the pair cannot silently become a single.
 */

/**
 * The two voices a chapter must carry.
 *
 * `official` restitutes the source that holds authority — the population
 * division, the geological survey, the resolution text — without irony. It is
 * not the adversary; a dossier that treats it as one has swapped one
 * unexamined authority for another.
 *
 * `counter` widens rather than denies. It names what the official framing does
 * not measure, who produced the figure and for what use, or what a second
 * established source measures of the same object. "Actually, it's wrong" is
 * out of register; so is "it's complicated" with nothing cited under it.
 */
// @req REQ-114
export const DOSSIER_READING_STANCES = ["official", "counter"] as const;
export type DossierReadingStance = (typeof DOSSIER_READING_STANCES)[number];

/** The editorial verticals the Dossiers axis is divided into. */
// @req REQ-114
export const DOSSIER_VERTICALS = ["realites", "nommer"] as const;
export type DossierVertical = (typeof DOSSIER_VERTICALS)[number];

export type DossierId = `DOS_${string}`;

export interface DossierSource {
  sourceKey: string;
  title: string;
  url: string | null;
  tier: SourceTier;
  source_kind?: SourceKind;
  publicationYear?: number;
  notes?: string;
}

export interface DossierSourceReference {
  sourceRefs: string[];
}

export interface DossierFicheMeta {
  format: "AFRIK JSON v2";
  entity: "dossier";
  directives: string;
  readerFacing?: string[];
}

/**
 * A picture the chapter is *about*, never a picture that decorates it.
 *
 * `licenceUrl` and `filePage` are separate fields on purpose: brand charter §9
 * rules that a licence is published, not named, so the rendered caption owes
 * the reader the licence's URI and a way back to the file. A caption that says
 * "CC BY-SA 2.0" and stops is a notice nobody can reach.
 */
export interface DossierIllustration {
  src: string;
  alt: string;
  caption: string;
  author: string | null;
  licence: string;
  licenceUrl: string | null;
  filePage: string | null;
  year: string | null;
}

export interface DossierProseBlock extends DossierSourceReference {
  text: string;
}

export interface DossierReading extends DossierSourceReference {
  stance: DossierReadingStance;
  label: string;
  body: string;
}

export interface DossierFigure extends DossierSourceReference {
  figureKey: string;
  label: string;
  value: string;
  year: number;
  note: string | null;
}

export interface DossierThesisFigure extends DossierSourceReference {
  figureKey: string;
  value: string;
  claim: string;
  provenance: string;
  year: number;
}

export interface DossierThesis {
  stepLabel: string;
  heading: string;
  figures: DossierThesisFigure[];
}

export interface DossierChapter {
  chapterKey: string;
  ordinal: number;
  title: string;
  question: string;
  standfirst: string;
  body: DossierProseBlock[];
  illustration: DossierIllustration | null;
  readings: DossierReading[];
  figures: DossierFigure[];
}

export interface DossierGap {
  fieldPath: string;
  reason: string;
}

export interface Dossier {
  _meta: DossierFicheMeta;
  id: DossierId;
  vertical: DossierVertical;
  slug: string;
  title: string;
  question: string;
  standfirst: string;
  publishedOn: string;
  thesis: DossierThesis;
  chapters: DossierChapter[];
  sources: DossierSource[];
  gaps: DossierGap[];
}

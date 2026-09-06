import type { SourceKind, SourceTier } from "@/types/sources";

/** Optional paired perspectives supplement a sourced narrative. */
// @req REQ-114
export const DOSSIER_READING_STANCES = ["official", "counter"] as const;
export type DossierReadingStance = (typeof DOSSIER_READING_STANCES)[number];

/** Internal corpus compatibility; public discovery uses dossier themes. */
// @req REQ-114
export const DOSSIER_VERTICALS = [
  "realites",
  "nommer",
  "histoires",
  "spiritualites",
] as const;
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

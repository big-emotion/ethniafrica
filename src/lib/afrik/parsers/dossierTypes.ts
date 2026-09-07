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

/**
 * The domain a dossier is filed under for the reader, in menu order.
 *
 * One word each, from the vocabulary the fiches already teach — the country
 * fiche's culture block reads Religions · Économie · Organisation · Relations.
 * A dossier declares its own, so publishing one is a file in this directory
 * rather than an entry in the module registry, a PageType, two slugs, a glyph
 * and two menu labels.
 *
 * The third classification this corpus carries, and deliberately the only one
 * a reader meets in the menu. `vertical` above is internal, as its own comment
 * says. The eight entries in `lib/dossiers/themes.ts` are the hub's filter and
 * are pairs of words — good for a filter, prose in a heading. They disagree
 * with this list in at least one place (« Les vraies proportions » is filed
 * under `pouvoirs` there and belongs to `territoires` here), which is a reason
 * to retire that list rather than to derive this one from it.
 */
// @req REQ-120
export const DOSSIER_RUBRICS = [
  "noms",
  "organisation",
  "religions",
  "territoires",
  "populations",
  "economie",
] as const;
export type DossierRubric = (typeof DOSSIER_RUBRICS)[number];

/**
 * Whether this dossier is offered to a reader, declared per dossier.
 *
 * The freeze used to live on the module registry, which meant an editor
 * withdrawing a reading edited a TypeScript file describing menus. It is a
 * property of the dossier, so it sits in the dossier.
 */
// @req REQ-114
export const DOSSIER_READINESS = ["ready", "draft"] as const;
export type DossierReadiness = (typeof DOSSIER_READINESS)[number];

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
  rubric: DossierRubric;
  readiness: DossierReadiness;
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

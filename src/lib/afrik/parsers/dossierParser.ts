/**
 * Strict parser for DOS_* dossier fiches.
 *
 * The shape checks below are the ordinary AFRIK discipline. Four rules are
 * particular to this entity, and each of them exists because the alternative
 * fails silently rather than loudly:
 *
 *  - **Both readings, or neither.** A chapter with one reading still renders,
 *    still validates as prose, and still reads as finished. What it publishes
 *    is an official account with nothing beside it, which is the one thing the
 *    Dossiers axis exists not to do.
 *  - **A reading cites.** "It is more complicated than that" with no source
 *    under it is an opinion wearing the dress of a counter-reading.
 *  - **A licence is published, not named** (brand charter §9). An attributed
 *    licence with no author, or no address, is a notice the reader cannot act
 *    on — and the caption is the one line on the page that is not editorial
 *    discretion.
 *  - **Ordinals follow position.** The chapters are a reading order, and a
 *    hand-kept ordinal that disagrees with the array is a numbering the
 *    reader sees and the loader does not.
 */

import { z } from "zod";

import { SOURCE_KINDS, SOURCE_TIERS } from "@/types/sources";

import {
  DOSSIER_READING_STANCES,
  DOSSIER_VERTICALS,
  type Dossier,
} from "./dossierTypes";

const sourceRefsSchema = z.array(z.string().min(1)).min(1, {
  message: "at least one source reference is required",
});

const dossierMetaSchema = z
  .object({
    format: z.literal("AFRIK JSON v2"),
    entity: z.literal("dossier"),
    directives: z.string().min(1),
    readerFacing: z.array(z.string().min(1)).optional(),
  })
  .strict();

const dossierSourceSchema = z
  .object({
    sourceKey: z.string().min(1),
    title: z.string().min(1),
    url: z.url().nullable(),
    tier: z.enum(SOURCE_TIERS, {
      error: `tier must be one of ${SOURCE_TIERS.join(", ")}`,
    }),
    source_kind: z.enum(SOURCE_KINDS).optional(),
    publicationYear: z.number().int().optional(),
    notes: z.string().optional(),
  })
  .strict();

const dossierIllustrationSchema = z
  .object({
    src: z.string().min(1),
    alt: z.string().min(1),
    caption: z.string().min(1),
    author: z.string().min(1).nullable(),
    licence: z.string().min(1),
    licenceUrl: z.url().nullable(),
    filePage: z.url().nullable(),
    year: z.string().min(1).nullable(),
  })
  .strict();

const dossierProseBlockSchema = z
  .object({
    text: z.string().min(1),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const dossierReadingSchema = z
  .object({
    stance: z.enum(DOSSIER_READING_STANCES),
    label: z.string().min(1),
    body: z.string().min(1),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const dossierFigureSchema = z
  .object({
    figureKey: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
    year: z.number().int(),
    note: z.string().min(1).nullable(),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const dossierThesisFigureSchema = z
  .object({
    figureKey: z.string().min(1),
    value: z.string().min(1),
    claim: z.string().min(1),
    provenance: z.string().min(1),
    year: z.number().int(),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const dossierThesisSchema = z
  .object({
    stepLabel: z.string().min(1),
    heading: z.string().min(1),
    figures: z.array(dossierThesisFigureSchema).min(1).max(3),
  })
  .strict();

const dossierChapterSchema = z
  .object({
    chapterKey: z.string().min(1),
    ordinal: z.number().int().positive(),
    title: z.string().min(1),
    question: z.string().min(1),
    standfirst: z.string().min(1),
    body: z.array(dossierProseBlockSchema).min(1),
    illustration: dossierIllustrationSchema.nullable(),
    readings: z.array(dossierReadingSchema),
    figures: z.array(dossierFigureSchema),
  })
  .strict();

const dossierGapSchema = z
  .object({
    fieldPath: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

const dossierSchema = z
  .object({
    _meta: dossierMetaSchema,
    id: z.string().regex(/^DOS_[A-Z0-9_]+$/, {
      message: "id must match DOS_[A-Z0-9_]+",
    }),
    vertical: z.enum(DOSSIER_VERTICALS),
    slug: z.string().regex(/^[a-z0-9-]+$/, {
      message: "slug must be lowercase kebab-case",
    }),
    title: z.string().min(1),
    question: z.string().min(1),
    standfirst: z.string().min(1),
    publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "publishedOn must be an ISO calendar date",
    }),
    thesis: dossierThesisSchema,
    chapters: z.array(dossierChapterSchema).min(1),
    sources: z.array(dossierSourceSchema).min(1),
    gaps: z.array(dossierGapSchema),
  })
  .strict();

/**
 * Licences whose terms oblige the page to name someone and to publish an
 * address. Public-domain works oblige neither, and are credited anyway.
 */
function licenceRequiresAttribution(licence: string): boolean {
  return /^cc\s*by/i.test(licence.trim());
}

export interface DossierParseResult {
  success: boolean;
  data?: Dossier;
  errors: string[];
}

/**
 * The cross-field rules, run on whatever the file actually holds.
 *
 * Deliberately tolerant of a malformed candidate, because it runs whether or
 * not the shape check passed. A curator repairing a fiche wants the shape
 * error and the doctrine error in the same pass; reporting only the first
 * sends them round the loop once per mistake, and the doctrine errors — the
 * ones this entity exists for — are always the last to surface that way.
 */
function collectSemanticErrors(candidate: unknown): string[] {
  if (!candidate || typeof candidate !== "object") return [];

  const dossier = candidate as Partial<Dossier>;
  const errors: string[] = [];
  const sources = Array.isArray(dossier.sources) ? dossier.sources : [];
  const chapters = Array.isArray(dossier.chapters) ? dossier.chapters : [];

  const declaredKeys = new Set(sources.map((source) => source?.sourceKey));
  const seenSourceKeys = new Set<string>();
  for (const source of sources) {
    if (seenSourceKeys.has(source?.sourceKey)) {
      errors.push(`sources: "${source.sourceKey}" is declared twice`);
    }
    seenSourceKeys.add(source?.sourceKey);
  }

  const requireResolvable = (refs: unknown, where: string) => {
    if (!Array.isArray(refs)) return;
    for (const ref of refs) {
      if (!declaredKeys.has(ref)) {
        errors.push(
          `${where}: source reference "${ref}" is not declared in sources`
        );
      }
    }
  };

  const thesisFigures = Array.isArray(dossier.thesis?.figures)
    ? dossier.thesis.figures
    : [];
  thesisFigures.forEach((figure, index) => {
    requireResolvable(figure?.sourceRefs, `thesis.figures[${index}]`);
  });

  const seenChapterKeys = new Set<string>();
  chapters.forEach((chapter, index) => {
    const where = `chapters[${index}]`;
    if (!chapter || typeof chapter !== "object") return;

    if (chapter.ordinal !== index + 1) {
      errors.push(
        `${where}: ordinal is ${chapter.ordinal} but the chapter sits at position ${index + 1}`
      );
    }

    if (seenChapterKeys.has(chapter.chapterKey)) {
      errors.push(`${where}: chapterKey "${chapter.chapterKey}" is used twice`);
    }
    seenChapterKeys.add(chapter.chapterKey);

    const readings = Array.isArray(chapter.readings) ? chapter.readings : [];
    for (const stance of DOSSIER_READING_STANCES) {
      const carried = readings.filter((reading) => reading?.stance === stance);
      if (carried.length === 0) {
        errors.push(
          `${where}: no "${stance}" reading — a chapter states the authoritative account and what it leaves out, never one alone`
        );
      }
    }

    readings.forEach((reading, readingIndex) => {
      requireResolvable(
        reading?.sourceRefs,
        `${where}.readings[${readingIndex}]`
      );
    });
    (Array.isArray(chapter.body) ? chapter.body : []).forEach(
      (block, blockIndex) => {
        requireResolvable(block?.sourceRefs, `${where}.body[${blockIndex}]`);
      }
    );
    (Array.isArray(chapter.figures) ? chapter.figures : []).forEach(
      (figure, figureIndex) => {
        requireResolvable(
          figure?.sourceRefs,
          `${where}.figures[${figureIndex}]`
        );
      }
    );

    const illustration = chapter.illustration;
    if (illustration && licenceRequiresAttribution(illustration.licence)) {
      if (!illustration.author) {
        errors.push(
          `${where}.illustration: "${illustration.licence}" requires attribution but no author is named`
        );
      }
      if (!illustration.licenceUrl) {
        errors.push(
          `${where}.illustration: "${illustration.licence}" is named but its address is not published`
        );
      }
    }
  });

  return errors;
}

// @req REQ-114
export function parseDossierFile(raw: unknown): DossierParseResult {
  const parsed = dossierSchema.safeParse(raw);
  const shapeErrors = parsed.success
    ? []
    : parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`
      );
  const errors = [...shapeErrors, ...collectSemanticErrors(raw)];

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: parsed.data as Dossier, errors: [] };
}

/**
 * Public shape of a dossier on /api/v2.
 *
 * The schema exists to stop the serving layer publishing something the strict
 * model never sanctioned — a chapter with one reading, a source with no tier —
 * even if a row reached the table by a route other than the loader. The parser
 * guards the way in; this guards the way out.
 */

import { z } from "zod";

import { SOURCE_KINDS, SOURCE_TIERS } from "@/types/sources";
import {
  DOSSIER_READING_STANCES,
  DOSSIER_VERTICALS,
} from "@/lib/afrik/parsers/dossierTypes";

// @req REQ-114
export const dossierIdParamSchema = z
  .string()
  .regex(/^DOS_[A-Z0-9_]+$/, { message: "id must match DOS_[A-Z0-9_]+" });

const publicSourceSchema = z.object({
  sourceKey: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  tier: z.enum(SOURCE_TIERS),
  source_kind: z.enum(SOURCE_KINDS).optional(),
  publicationYear: z.number().int().optional(),
  notes: z.string().optional(),
});

const publicReadingSchema = z.object({
  stance: z.enum(DOSSIER_READING_STANCES),
  label: z.string(),
  body: z.string(),
  sourceRefs: z.array(z.string()).min(1),
});

const publicChapterSchema = z
  .object({
    chapterKey: z.string(),
    ordinal: z.number().int().positive(),
    title: z.string(),
    question: z.string(),
    standfirst: z.string(),
    body: z.array(
      z.object({ text: z.string(), sourceRefs: z.array(z.string()) })
    ),
    illustration: z
      .object({
        src: z.string(),
        alt: z.string(),
        caption: z.string(),
        author: z.string().nullable(),
        licence: z.string(),
        licenceUrl: z.string().nullable(),
        filePage: z.string().nullable(),
        year: z.string().nullable(),
      })
      .nullable(),
    readings: z.array(publicReadingSchema),
    figures: z.array(
      z.object({
        figureKey: z.string(),
        label: z.string(),
        value: z.string(),
        year: z.number().int(),
        note: z.string().nullable(),
        sourceRefs: z.array(z.string()),
      })
    ),
  })
  // The doctrine, restated where a reuser can see it fail. A consumer of this
  // API is entitled to assume both readings are present, because that is the
  // one promise the entity makes that its fields alone do not.
  .refine(
    (chapter) =>
      DOSSIER_READING_STANCES.every((stance) =>
        chapter.readings.some((reading) => reading.stance === stance)
      ),
    { message: "a chapter publishes both an official and a counter reading" }
  );

// @req REQ-114
export const publicDossierSchema = z.object({
  id: z.string(),
  vertical: z.enum(DOSSIER_VERTICALS),
  slug: z.string(),
  publishedOn: z.string(),
  title: z.string(),
  question: z.string(),
  standfirst: z.string(),
  thesis: z.object({
    stepLabel: z.string(),
    heading: z.string(),
    figures: z.array(
      z.object({
        figureKey: z.string(),
        value: z.string(),
        claim: z.string(),
        provenance: z.string(),
        year: z.number().int(),
        sourceRefs: z.array(z.string()),
      })
    ),
  }),
  chapters: z.array(publicChapterSchema),
  sources: z.array(publicSourceSchema),
  gaps: z.array(z.object({ fieldPath: z.string(), reason: z.string() })),
});

// @req REQ-114
export const publicDossierSummarySchema = z.object({
  id: z.string(),
  vertical: z.enum(DOSSIER_VERTICALS),
  slug: z.string(),
  publishedOn: z.string(),
  title: z.string(),
  question: z.string(),
  standfirst: z.string(),
  chapterCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
});

// @req REQ-114
export const listDossiersQuerySchema = z.object({
  vertical: z.enum(DOSSIER_VERTICALS).optional(),
});

export type PublicDossier = z.infer<typeof publicDossierSchema>;
export type PublicDossierSummary = z.infer<typeof publicDossierSummarySchema>;

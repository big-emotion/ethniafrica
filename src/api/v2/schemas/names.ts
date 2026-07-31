/**
 * Zod schemas for `/v2/names` and `/v2/peoples/{id}/names` (Epic 8 — Names
 * Atlas, FR53-FR58). Both endpoints share this file (8.6, 8.7).
 */

import { z } from "zod";

export const peopleNamesParamSchema = z.object({
  id: z.string().regex(/^PPL_[A-Z0-9_]+$/, {
    message: "Invalid people id format (expected PPL_*)",
  }),
});

export type PeopleNamesParam = z.infer<typeof peopleNamesParamSchema>;

export const nameRecordTypeSchema = z.enum([
  "endonym",
  "exonym",
  "historical_spelling",
  "surname",
]);

export type NameRecordType = z.infer<typeof nameRecordTypeSchema>;

export const nameRecordSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  year: z.number().int().nullable(),
  tier: z.string().nullable(),
});

export type NameRecordSourceView = z.infer<typeof nameRecordSourceSchema>;

export const nameRecordImpositionSchema = z.object({
  imposedBy: z.string().nullable(),
  impositionPeriod: z.string().nullable(),
  whyProblematic: z.string().nullable(),
  contemporaryUsage: z.string().nullable(),
});

export type NameRecordImposition = z.infer<typeof nameRecordImpositionSchema>;

export const nameRecordConfidenceSchema = z.object({
  score: z.number(),
  recomputedAt: z.string().nullable(),
});

export type NameRecordConfidenceView = z.infer<
  typeof nameRecordConfidenceSchema
>;

/**
 * A single name entry in a people's dossier (`GET /v2/peoples/{id}/names`).
 * `imposition` bundles the four imposed-name-context fields from the API
 * surface spec; it is non-null whenever any of them carries data (the
 * illustrative dossier shape nests `contemporaryUsage` here even for
 * non-imposed endonyms, so gating on `imposedBy` alone would drop data).
 */
export const peopleNameRecordSchema = z.object({
  id: z.string(),
  nameText: z.string(),
  nameType: nameRecordTypeSchema,
  languageOfOrigin: z.string().nullable(),
  meaning: z.string().nullable(),
  periodLabel: z.string().nullable(),
  imposition: nameRecordImpositionSchema.nullable(),
  assertionId: z.string(),
  sources: z.array(nameRecordSourceSchema),
  confidence: nameRecordConfidenceSchema.nullable(),
});

export type PeopleNameRecord = z.infer<typeof peopleNameRecordSchema>;

export const peopleNamesDossierSchema = z.object({
  peopleId: z.string(),
  autonym: z.string().nullable(),
  names: z.array(peopleNameRecordSchema),
});

export type PeopleNamesDossier = z.infer<typeof peopleNamesDossierSchema>;

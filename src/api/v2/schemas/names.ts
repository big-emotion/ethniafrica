/**
 * Zod schemas for `/v2/names` and `/v2/peoples/{id}/names` (Epic 8 — Names
 * Atlas, FR53-FR58). Both endpoints share this file (8.6, 8.7).
 *
 * `name_records` (migration 029) holds structured name-variant dossiers
 * (endonym | exonym | historical_spelling | surname) attached to peoples.
 * v1 only populates entity_type='people'.
 */

import { z } from "zod";

// @req REQ-057
export const peopleNamesParamSchema = z.object({
  id: z.string().regex(/^PPL_[A-Z0-9_]+$/, {
    message: "Invalid people id format (expected PPL_*)",
  }),
});

export type PeopleNamesParam = z.infer<typeof peopleNamesParamSchema>;

// @req REQ-057
export const nameRecordTypeSchema = z.enum([
  "endonym",
  "exonym",
  "historical_spelling",
  "surname",
]);

export type NameRecordType = z.infer<typeof nameRecordTypeSchema>;

// @req REQ-057
export const nameRecordSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  year: z.number().int().nullable(),
  tier: z.string().nullable(),
});

export type NameRecordSourceView = z.infer<typeof nameRecordSourceSchema>;

// @req REQ-057
export const nameRecordImpositionSchema = z.object({
  imposedBy: z.string().nullable(),
  impositionPeriod: z.string().nullable(),
  whyProblematic: z.string().nullable(),
  contemporaryUsage: z.string().nullable(),
});

export type NameRecordImposition = z.infer<typeof nameRecordImpositionSchema>;

// @req REQ-057
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
// @req REQ-057
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

// @req REQ-057
export const peopleNamesDossierSchema = z.object({
  peopleId: z.string(),
  autonym: z.string().nullable(),
  names: z.array(peopleNameRecordSchema),
});

export type PeopleNamesDossier = z.infer<typeof peopleNamesDossierSchema>;

/** Lightweight people reference embedded in each name record. */
// @req REQ-057
export const peopleSummarySchema = z.object({
  id: z.string(),
  nameMain: z.string(),
  autonym: z.string().nullable(),
  slug: z.string(),
});

export type PeopleSummary = z.infer<typeof peopleSummarySchema>;

// @req REQ-057
export const nameRecordSchema = z.object({
  id: z.uuid(),
  peopleId: z.string(),
  nameText: z.string(),
  nameType: nameRecordTypeSchema,
  languageOfOrigin: z.string().nullable(),
  meaning: z.string().nullable(),
  periodLabel: z.string().nullable(),
  imposedBy: z.string().nullable(),
  impositionPeriod: z.string().nullable(),
  whyProblematic: z.string().nullable(),
  contemporaryUsage: z.string().nullable(),
  sortRank: z.number().int(),
  people: peopleSummarySchema.nullable(),
});

export type NameRecord = z.infer<typeof nameRecordSchema>;

/**
 * GET /v2/names query parameters.
 *
 * `imposedOnly` is accepted as the literal strings "true"/"false" (query
 * strings carry no boolean type) and normalised to a real boolean.
 */
// @req REQ-057
export const listNamesQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  nameType: nameRecordTypeSchema.optional(),
  imposedOnly: z
    .enum(["true", "false"], {
      message: "imposedOnly must be 'true' or 'false'",
    })
    .optional()
    .transform((value) => value === "true"),
  peopleId: z
    .string()
    .regex(/^PPL_[A-Z_]+$/, {
      message: "peopleId must match PPL_xxx",
    })
    .optional(),
  letter: z
    .string()
    .length(1, { message: "letter must be exactly one character" })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListNamesQuery = z.infer<typeof listNamesQuerySchema>;

/** A people that bears a name form. */
// @req REQ-054
export const nameFormBearerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type NameFormBearer = z.infer<typeof nameFormBearerSchema>;

/**
 * One entry of the Appellations nomenclature: a name, and everyone who bears
 * it.
 *
 * The unit is the *form*, not the record — `afrik_name_forms` (migration 071)
 * folds accents and case so "Traoré" and "Traore" are one entry rather than
 * two, and carries its bearers as an attribute instead of making each of them
 * a separate line pointing at a people fiche.
 */
// @req REQ-054
export const nameFormSchema = z.object({
  formKey: z.string(),
  displayName: z.string(),
  spellings: z.array(z.string()),
  nameTypes: z.array(nameRecordTypeSchema),
  bearerCount: z.number().int(),
  bearers: z.array(nameFormBearerSchema),
  hasImposed: z.boolean(),
  whyProblematic: z.string().nullable(),
  languageOfOrigin: z.string().nullable(),
});

export type NameForm = z.infer<typeof nameFormSchema>;

/**
 * GET query for the nomenclature.
 *
 * `page` rather than `offset`: the surface pages over forms, and a reader who
 * edits the URL should be able to say which page they want without knowing
 * the page size. It is also what makes the pagination links plain anchors.
 */
// @req REQ-054
export const listNameFormsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  nameType: nameRecordTypeSchema.optional(),
  imposedOnly: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(48),
});

export type ListNameFormsQuery = z.infer<typeof listNameFormsQuerySchema>;

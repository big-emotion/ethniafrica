/**
 * Zod schemas for /v2/names endpoints (Epic 8, FR53/FR55/FR58).
 *
 * `name_records` (migration 029) holds structured name-variant dossiers
 * (endonym | exonym | historical_spelling | surname) attached to peoples.
 * v1 only populates entity_type='people'.
 */

import { z } from "zod";

export const nameRecordTypeSchema = z.enum([
  "endonym",
  "exonym",
  "historical_spelling",
  "surname",
]);

export type NameRecordType = z.infer<typeof nameRecordTypeSchema>;

/** Lightweight people reference embedded in each name record. */
export const peopleSummarySchema = z.object({
  id: z.string(),
  nameMain: z.string(),
  autonym: z.string().nullable(),
  slug: z.string(),
});

export type PeopleSummary = z.infer<typeof peopleSummarySchema>;

export const nameRecordSchema = z.object({
  id: z.string().uuid(),
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

/**
 * Name-record parser - Zod schema + parseNameRecordFile for the AFRIK
 * name-record strict model (public/modele-nom.json). See Epic 8 spec (FR56, FR57).
 */

import { z } from "zod";
import type { NameRecordDossier } from "@/types/names";

const nameRecordMetaSchema = z
  .object({
    format: z.literal("AFRIK JSON v2"),
    entity: z.literal("nom"),
    directives: z.string().min(1),
    // Marks fixture-quality dataset examples so the loader (8.5) excludes
    // them from production loads. Not part of the standard model shape.
    illustrative: z.boolean().optional(),
  })
  .strict();

const nameRecordSourceSchema = z
  .object({
    title: z.string().min(1),
    author: z.string().min(1),
    year: z.number().int(),
    url: z.string().min(1),
    tier: z.union([z.literal(1), z.literal(2)], {
      errorMap: () => ({
        message: "tier must be 1 or 2 — Tier 3 sources are forbidden",
      }),
    }),
    notes: z.string().optional(),
  })
  .strict();

const nameRecordTypeSchema = z.enum(
  ["endonym", "exonym", "historical_spelling", "surname"],
  {
    errorMap: () => ({
      message:
        "nameType must be one of endonym, exonym, historical_spelling, surname (name_record_type enum, migration 029)",
    }),
  }
);

const nameRecordEntrySchema = z
  .object({
    nameText: z.string().min(1),
    nameType: nameRecordTypeSchema,
    languageOfOrigin: z
      .string()
      .regex(/^[a-z]{3}$/, {
        message: "languageOfOrigin must be an ISO 639-3 code",
      })
      .nullable(),
    meaning: z.string().nullable(),
    periodLabel: z.string().nullable(),
    imposedBy: z.string().nullable(),
    impositionPeriod: z.string().nullable(),
    whyProblematic: z.string().nullable(),
    contemporaryUsage: z.string().nullable(),
    sortRank: z.number().int(),
    sources: z.array(nameRecordSourceSchema).min(1, {
      message: "at least one source (Tier 1 or Tier 2) is required",
    }),
  })
  .strict()
  .superRefine((entry, ctx) => {
    const hasImposedBy = !!entry.imposedBy && entry.imposedBy.trim() !== "";
    const hasWhyProblematic =
      !!entry.whyProblematic && entry.whyProblematic.trim() !== "";

    if (hasImposedBy && !hasWhyProblematic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whyProblematic"],
        message:
          "whyProblematic is required when imposedBy is set (FR56-imposed)",
      });
    }
  });

export const nameRecordDossierSchema = z
  .object({
    _meta: nameRecordMetaSchema,
    id: z.string().regex(/^PPL_[A-Z0-9_]+$/, {
      message: "id must match ^PPL_[A-Z0-9_]+$",
    }),
    entityType: z.literal("people", {
      errorMap: () => ({
        message: "entityType must be 'people' (v1 scope, migration 029)",
      }),
    }),
    names: z.array(nameRecordEntrySchema).min(1),
  })
  .strict();

export interface NameRecordParseFieldError {
  path: string;
  message: string;
}

export interface ParsedNameRecordFile {
  success: boolean;
  data?: NameRecordDossier;
  errors?: NameRecordParseFieldError[];
}

export function parseNameRecordFile(raw: unknown): ParsedNameRecordFile {
  const result = nameRecordDossierSchema.safeParse(raw);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  // tsconfig has strictNullChecks: false (project-wide, see CLAUDE.md), which
  // zod's conditional output-type inference does not support cleanly — it
  // widens every field to optional. The cast is safe: safeParse succeeded.
  return { success: true, data: result.data as NameRecordDossier };
}

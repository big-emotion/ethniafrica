/**
 * Person parser — Zod schema + parsePersonFile for the ARCH-018 person
 * strict model. See supabase/migrations/057_person_schema.sql, ETNI-1382.
 */

import { z } from "zod";
import type { PersonDossier } from "@/types/persons";
import { PERSON_PEOPLE_RELATION_LABELS } from "@/types/persons";
import { ficheSourceTierSchema } from "./ficheSourceTier";

const personMetaSchema = z
  .object({
    format: z.literal("AFRIK JSON v2"),
    entity: z.literal("personne"),
    directives: z.string().min(1),
    // Marks fixture-quality dataset examples so the loader excludes them
    // from production loads (same contract as nameRecordParser). Not part
    // of the standard model shape.
    illustrative: z.boolean().optional(),
  })
  .strict();

const personSourceSchema = z
  .object({
    title: z.string().min(1),
    author: z.string().min(1),
    year: z.number().int(),
    url: z.string().min(1),
    tier: ficheSourceTierSchema,
    notes: z.string().optional(),
  })
  .strict();

const personPeopleLinkSchema = z
  .object({
    peopleId: z.string().regex(/^PPL_[A-Z0-9_]+$/, {
      message: "peopleId must match ^PPL_[A-Z0-9_]+$",
    }),
    relationLabel: z.enum(PERSON_PEOPLE_RELATION_LABELS, {
      errorMap: () => ({
        message: "relationLabel must be one of membership, observation",
      }),
    }),
  })
  .strict();

// @req REQ-137
export const personDossierSchema = z
  .object({
    _meta: personMetaSchema,
    id: z.string().regex(/^PER_[A-Z0-9_]+$/, {
      message: "id must match ^PER_[A-Z0-9_]+$",
    }),
    fullName: z.string().min(1),
    roleCategory: z.string().min(1, {
      message: "roleCategory is required (NOT NULL, migration 057)",
    }),
    countryIds: z.array(z.string().regex(/^[A-Z]{3}$/)).default([]),
    peopleLinks: z.array(personPeopleLinkSchema).default([]),
    sources: z.array(personSourceSchema).min(1, {
      message: "at least one source is required (source or nothing, ARCH-018)",
    }),
  })
  .strict();

export interface PersonParseFieldError {
  path: string;
  message: string;
}

export interface ParsedPersonFile {
  success: boolean;
  data?: PersonDossier;
  errors?: PersonParseFieldError[];
}

// @req REQ-137
export function parsePersonFile(raw: unknown): ParsedPersonFile {
  const result = personDossierSchema.safeParse(raw);

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
  return { success: true, data: result.data as PersonDossier };
}

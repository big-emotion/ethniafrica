/**
 * Relation parser - Zod schema + parseRelationFile for the AFRIK relation
 * strict model (public/modele-relation.json). See Epic 11 spec (FR73, FR74).
 */

import { z } from "zod";
import type { RelationRecord } from "@/types/relations";
import { ficheSourceTierSchema } from "./ficheSourceTier";

const relationSourceSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int(),
  url: z.string().min(1),
  tier: ficheSourceTierSchema,
  notes: z.string().optional(),
});

const relationPeriodSchema = z
  .object({
    startYear: z.number().int().nullable(),
    endYear: z.number().int().nullable(),
    label: z.string(),
  })
  .refine(
    (period) =>
      period.startYear === null ||
      period.endYear === null ||
      period.startYear <= period.endYear,
    {
      message: "startYear must be <= endYear when both are present",
      path: ["startYear"],
    }
  );

const relationTypeSchema = z.enum(["migratory", "commercial", "religious"], {
  errorMap: () => ({
    message:
      "relationType must be one of migratory, commercial, religious (linguistic is derived-only and never stored — FR73)",
  }),
});

export const relationSchema = z
  .object({
    id: z.string().regex(/^REL_[A-Z0-9_]+$/, {
      message: "id must match ^REL_[A-Z0-9_]+$",
    }),
    relationType: relationTypeSchema,
    peopleIdA: z.string().min(1),
    peopleIdB: z.string().min(1),
    direction: z.enum(["a_to_b", "b_to_a", "bidirectional"]),
    period: relationPeriodSchema,
    description: z.string().min(1),
    sources: z.array(relationSourceSchema).min(1, {
      message: "at least one tiered source is required",
    }),
  })
  .refine((record) => record.peopleIdA !== record.peopleIdB, {
    message: "peopleIdA and peopleIdB must not reference the same people",
    path: ["peopleIdB"],
  });

export interface RelationParseFieldError {
  path: string;
  message: string;
}

export interface ParsedRelationFile {
  success: boolean;
  data?: RelationRecord;
  errors?: RelationParseFieldError[];
}

export function parseRelationFile(raw: unknown): ParsedRelationFile {
  const result = relationSchema.safeParse(raw);

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
  return { success: true, data: result.data as RelationRecord };
}

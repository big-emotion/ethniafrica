/**
 * Migration parser - Zod schema + parseMigrationFile for the AFRIK
 * migration-event strict model (public/modele-migration.json). Mirrors the
 * per-file FR80 rules from scripts/validateAfrikData.ts's
 * validateMigrationEvents (Story 12.1) so migrationJsonLoader can gate loads
 * without duplicating that logic inline. Cross-file rules (duplicate ids,
 * peoplesInvolved resolving to an existing PPL fiche) need corpus-wide
 * context and stay in the validator script — see Epic 12 Story 12.4
 * (ETNI-517, FR80).
 */

import { z } from "zod";
import { MIGRATION_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";
import type { MigrationRecord } from "@/types/migrations";

const migrationEventTypeSchema = z.enum(MIGRATION_EVENT_TYPES, {
  errorMap: () => ({
    message: `eventType must be one of ${MIGRATION_EVENT_TYPES.join(", ")}`,
  }),
});

const migrationClassificationStatusSchema = z.enum(
  ["consensual", "contested", "colonial-legacy", "reconstructive"],
  {
    errorMap: () => ({
      message:
        "classificationStatus must be one of consensual, contested, colonial-legacy, reconstructive",
    }),
  }
);

const CURRENT_YEAR = new Date().getFullYear();

const migrationTimeRangeSchema = z
  .object({
    startYear: z.number().int().min(-10000).max(CURRENT_YEAR),
    endYear: z.number().int().min(-10000).max(CURRENT_YEAR),
    datingNote: z.string().nullable(),
  })
  .refine((range) => range.startYear <= range.endYear, {
    message: "startYear must be <= endYear",
    path: ["startYear"],
  });

const migrationPositionSchema = z.tuple([z.number(), z.number()]);

const migrationGeometrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("LineString"),
    coordinates: z.array(migrationPositionSchema).min(2),
  }),
  z.object({
    type: z.literal("MultiLineString"),
    coordinates: z.array(z.array(migrationPositionSchema).min(2)).min(1),
  }),
  z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(migrationPositionSchema).min(4)).min(1),
  }),
]);

const migrationPeopleInvolvedSchema = z.object({
  id: z.string().min(1),
  role: z.string(),
});

const migrationSourceSchema = z
  .object({
    title: z.string().min(1),
    url: z.string().min(1),
    year: z.number().int(),
    tier: z.union([z.literal(1), z.literal(2)], {
      errorMap: () => ({
        message: "tier must be 1 or 2 — Tier 3 sources are forbidden",
      }),
    }),
    notes: z.string().optional(),
  })
  .refine((source) => source.tier !== 2 || !!source.notes?.trim(), {
    message: "Tier 2 sources require non-empty notes",
    path: ["notes"],
  });

const migrationContentSchema = z.object({
  summary: z.string().min(1),
  narrative: z.string().min(1),
  debate: z.string().nullable(),
  sources: z.array(migrationSourceSchema).min(1, {
    message: "at least one source (Tier 1 or Tier 2) is required",
  }),
});

export const migrationSchema = z
  .object({
    id: z.string().regex(/^MGR_[A-Z0-9_]+$/, {
      message: "id must match ^MGR_[A-Z0-9_]+$",
    }),
    nameMain: z.string().min(1),
    migrationGroup: z.string().nullable(),
    eventType: migrationEventTypeSchema,
    classificationStatus: migrationClassificationStatusSchema,
    timeRange: migrationTimeRangeSchema,
    geometry: migrationGeometrySchema,
    peoplesInvolved: z.array(migrationPeopleInvolvedSchema).min(1, {
      message: "at least one people must be involved",
    }),
    content: migrationContentSchema,
  })
  .refine(
    (record) =>
      !(
        record.classificationStatus === "contested" ||
        record.classificationStatus === "colonial-legacy"
      ) || record.content.sources.length >= 2,
    {
      message:
        "classificationStatus contested or colonial-legacy requires at least 2 sources",
      path: ["content", "sources"],
    }
  )
  .refine(
    (record) =>
      record.classificationStatus !== "contested" ||
      !!record.timeRange.datingNote?.trim(),
    {
      message: "contested events require a non-empty timeRange.datingNote",
      path: ["timeRange", "datingNote"],
    }
  )
  .refine(
    (record) =>
      record.classificationStatus !== "contested" ||
      !!record.content.debate?.trim(),
    {
      message: "contested events require a non-empty content.debate",
      path: ["content", "debate"],
    }
  );

export interface MigrationParseFieldError {
  path: string;
  message: string;
}

export interface ParsedMigrationFile {
  success: boolean;
  data?: MigrationRecord;
  errors?: MigrationParseFieldError[];
}

export function parseMigrationFile(raw: unknown): ParsedMigrationFile {
  const result = migrationSchema.safeParse(raw);

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
  return { success: true, data: result.data as MigrationRecord };
}

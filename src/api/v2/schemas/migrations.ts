/**
 * Zod schemas for the `/v2/migrations` endpoints (Epic 12, Story 12.5,
 * ETNI-518). Param/query validation only — response shapes are the plain TS
 * interfaces in `@/types/migrations` (MigrationSummary, MigrationDetailRecord).
 */

import { z } from "zod";
import { MIGRATION_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";

export const migrationEventTypeSchema = z.enum(MIGRATION_EVENT_TYPES);

export const migrationClassificationStatusSchema = z.enum([
  "consensual",
  "contested",
  "colonial-legacy",
  "reconstructive",
]);

// GET /api/v2/migrations/{id}
export const migrationDetailParamSchema = z.object({
  id: z.string().regex(/^MGR_[A-Z0-9_]+$/, {
    message: "Invalid migration id format (expected MGR_*)",
  }),
});

export type MigrationDetailParam = z.infer<typeof migrationDetailParamSchema>;

// GET /api/v2/migrations
export const listMigrationsQuerySchema = z
  .object({
    from: z.coerce.number().int().optional(),
    to: z.coerce.number().int().optional(),
    eventType: migrationEventTypeSchema.optional(),
    peopleId: z
      .string()
      .regex(/^PPL_[A-Z0-9_]+$/, {
        message: "Invalid peopleId format (expected PPL_*)",
      })
      .optional(),
    classificationStatus: migrationClassificationStatusSchema.optional(),
    group: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine(
    (val) =>
      val.from === undefined || val.to === undefined || val.from <= val.to,
    {
      message: "from must be <= to",
      path: ["from"],
    }
  );

export type ListMigrationsQuery = z.infer<typeof listMigrationsQuerySchema>;

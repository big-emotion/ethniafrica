import { z } from "zod";

export const revisionSchema = z.object({
  id: z.uuid(),
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  version: z.number().int().positive(),
  snapshot_jsonb: z.record(z.string(), z.unknown()),
  moderator_id: z.uuid().nullable(),
  reason: z.string().nullable(),
  published_at: z.string().nullable(),
  doctrine_version_id: z.uuid().nullable(),
  created_at: z.string(),
});

export type Revision = z.infer<typeof revisionSchema>;

export const insertRevisionInputSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  version: z.number().int().positive(),
  snapshot_jsonb: z.record(z.string(), z.unknown()),
  moderator_id: z.uuid().nullable().optional(),
  reason: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  doctrine_version_id: z.uuid().nullable().optional(),
});

export type InsertRevisionInput = z.infer<typeof insertRevisionInputSchema>;

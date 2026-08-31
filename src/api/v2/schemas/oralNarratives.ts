import { z } from "zod";

// @req REQ-095
export const oralNarrativeEntityTypeSchema = z.enum([
  "language_family",
  "people",
  "country",
]);

// @req REQ-095
export const listOralNarrativesQuerySchema = z.object({
  entityType: oralNarrativeEntityTypeSchema,
  entityId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListOralNarrativesQuery = z.infer<
  typeof listOralNarrativesQuerySchema
>;

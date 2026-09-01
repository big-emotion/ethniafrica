import { z } from "zod";

const mediaEntityTypeSchema = z.enum([
  "language_family",
  "language",
  "people",
  "country",
]);

const mediaDepictionTimingSchema = z.enum(["contemporary", "reconstitution"]);

// @req REQ-128
export const mediaSchema = z
  .object({
    entityType: mediaEntityTypeSchema,
    entityId: z.string().trim().min(1),
    author: z.string().trim().min(1).nullable(),
    licenceUri: z.string().trim().url(),
    sourcePageUrl: z.string().trim().url(),
    period: z.string().trim().min(1).nullable(),
    depictionTiming: mediaDepictionTimingSchema,
  })
  .strict();

// @req REQ-128
export type MediaInput = z.infer<typeof mediaSchema>;

// @req REQ-128
export const listMediaQuerySchema = z.object({
  entityType: mediaEntityTypeSchema,
  entityId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;

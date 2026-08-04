/**
 * Zod schema for GET /v2/compare (FR64, AR8, AR9, NFR38).
 *
 * `type` gates which entity service the handler looks up against; `ids` is
 * a comma-separated list of 2–3 distinct ids for that same entity type.
 */

import { z } from "zod";

// @req REQ-084
export const compareEntityTypeSchema = z.enum([
  "peoples",
  "countries",
  "language-families",
]);

export type CompareEntityTypeParam = z.infer<typeof compareEntityTypeSchema>;

const compareIdsSchema = z
  .string({ message: "ids is required" })
  .min(1, { message: "ids must contain 2 to 3 comma-separated ids" })
  .transform((value) => value.split(",").map((id) => id.trim()))
  .pipe(
    z
      .array(z.string().min(1))
      .min(2, { message: "ids must contain 2 to 3 comma-separated ids" })
      .max(3, { message: "ids must contain 2 to 3 comma-separated ids" })
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "ids must not contain duplicates",
      })
  );

// @req REQ-084
export const compareQuerySchema = z.object({
  type: compareEntityTypeSchema,
  ids: compareIdsSchema,
});

export type CompareQuery = z.infer<typeof compareQuerySchema>;

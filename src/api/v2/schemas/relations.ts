/**
 * Zod schemas for the `/v2` relations endpoints (Epic 11, Story 11.7, ETNI-508).
 *
 * Param/query validation only — response shapes are the plain TS interfaces
 * in `@/types/relations` (SourcedRelation, DerivedLinguisticLink,
 * PublicRelationRecord), following the precedent already set by Story 11.6.
 */

import { pageSizeSchema } from "@/api/v2/schemas/pagination";
import { z } from "zod";

// @req REQ-097
export const relationTypeSchema = z.enum([
  "migratory",
  "commercial",
  "religious",
]);

const csvRelationTypes = z
  .string()
  .optional()
  .transform((val) =>
    val
      ? val
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : undefined
  )
  .pipe(z.array(relationTypeSchema).optional());

/**
 * `z.coerce.boolean()` treats any non-empty string (incl. "false") as
 * truthy — wrong for a `?includeDerived=false` query param. This parses
 * "false"/"0" as false and everything else (including absence) per
 * defaultValue.
 */
function booleanQueryParam(defaultValue: boolean) {
  return z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined) return defaultValue;
      if (typeof val === "boolean") return val;
      return val !== "false" && val !== "0";
    });
}

// GET /api/v2/peoples/{id}/relations
// @req REQ-097
export const egoNetworkParamSchema = z.object({
  id: z.string().regex(/^PPL_[A-Z0-9_]+$/, {
    message: "Invalid people id format (expected PPL_*)",
  }),
});

// @req REQ-097
export const egoNetworkQuerySchema = z.object({
  types: csvRelationTypes,
  includeDerived: booleanQueryParam(true),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export type EgoNetworkQuery = z.infer<typeof egoNetworkQuerySchema>;

// GET /api/v2/relations/{id}
// @req REQ-097
export const relationDetailParamSchema = z.object({
  id: z.string().regex(/^REL_[A-Z0-9_]+$/, {
    message: "Invalid relation id format (expected REL_*)",
  }),
});

// GET /api/v2/relations
// @req REQ-097
export const listRelationsQuerySchema = z
  .object({
    types: csvRelationTypes,
    peopleId: z
      .string()
      .regex(/^PPL_[A-Z0-9_]+$/, {
        message: "Invalid peopleId format (expected PPL_*)",
      })
      .optional(),
    periodFrom: z.coerce.number().int().optional(),
    periodTo: z.coerce.number().int().optional(),
    limit: pageSizeSchema,
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine(
    (val) =>
      val.periodFrom === undefined ||
      val.periodTo === undefined ||
      val.periodFrom <= val.periodTo,
    {
      message: "periodFrom must be <= periodTo",
      path: ["periodFrom"],
    }
  );

export type ListRelationsQuery = z.infer<typeof listRelationsQuerySchema>;

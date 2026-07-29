/**
 * Zod schemas for GET /v2/language-families/{id}/tree/branch (Epic 7, FR48).
 */

import { z } from "zod";

export const languageFamilyTreeBranchParamSchema = z.object({
  id: z.string().regex(/^FLG_[A-Z_]+$/, {
    message: "Invalid language family id format (expected FLG_*)",
  }),
});

export type LanguageFamilyTreeBranchParam = z.infer<
  typeof languageFamilyTreeBranchParamSchema
>;

const isoLanguageRegex = /^[a-z]{3}$/;

export const languageFamilyTreeBranchQuerySchema = z
  .object({
    language: z
      .string()
      .regex(isoLanguageRegex, {
        message: 'Invalid language code (expected ISO 639-3, e.g. "kon")',
      })
      .optional(),
    group: z.literal("unlinked").optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((data) => (data.language ? 1 : 0) + (data.group ? 1 : 0) === 1, {
    message: "Exactly one of `language` or `group=unlinked` is required",
  });

export type LanguageFamilyTreeBranchQuery = z.infer<
  typeof languageFamilyTreeBranchQuerySchema
>;

export const familyTreeBranchNodeSchema = z.object({
  id: z.string(),
  nameMain: z.string(),
  classificationStatus: z
    .enum(["consensual", "contested", "colonial-legacy", "reconstructive"])
    .nullable(),
});

export type FamilyTreeBranchNode = z.infer<typeof familyTreeBranchNodeSchema>;

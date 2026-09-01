import { z } from "zod";

const languageIdSchema = z.string().regex(/^[a-z]{3}$/, {
  message: "Invalid language id format (expected lowercase ISO 639-3)",
});

const nonEmptyStringSchema = z.string().min(1);

const languageSourceSchema = z.object({
  id: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  url: z.string().nullable(),
  tier: z.enum(["official", "referenced", "unverified"]),
  notes: z.string().nullable().optional(),
});

// @req REQ-136
export const languageIdParamSchema = z.object({
  id: languageIdSchema,
});

// @req REQ-136
export const publicLanguageSchema = z.object({
  id: languageIdSchema,
  name: nonEmptyStringSchema,
  nameProvenance: z.enum(["sourced", "derived"]),
  family: z.object({
    id: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
  }),
  speakingPeoples: z.array(
    z.object({
      id: nonEmptyStringSchema,
      name: nonEmptyStringSchema,
    })
  ),
  vehicularRole: z.string().nullable(),
  vitalityStatus: z
    .object({
      status: nonEmptyStringSchema,
      scale: nonEmptyStringSchema,
      asOf: z.number().int().positive(),
    })
    .nullable(),
  sources: z.array(languageSourceSchema),
});

// @req REQ-136
export type PublicLanguage = z.infer<typeof publicLanguageSchema>;

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
  // Identifiers and name forms the corpus fills on every language fiche. They
  // were absent from this payload for the same reason they were absent from
  // the page — the aggregate below them never carried them — so a consumer
  // could not resolve a language against Glottolog or match an English name.
  isoCode639_3: languageIdSchema,
  glottocode: z.string().nullable(),
  nameEn: z.string().nullable(),
  alternateNames: z.array(nonEmptyStringSchema),
  spellingAliases: z.array(nonEmptyStringSchema),
  dialects: z.array(nonEmptyStringSchema),
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

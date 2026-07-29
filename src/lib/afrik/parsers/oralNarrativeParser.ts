import { z } from "zod";

const nullableText = z.string().min(1).nullable();

const oralNarrativeSchema = z
  .object({
    _meta: z
      .object({
        format: z.literal("AFRIK JSON v2"),
        entity: z.literal("recit_oral"),
        directives: z.string().min(1),
      })
      .strict(),
    id: z.string().regex(/^ORL_[A-Z0-9_]+$/),
    links: z
      .object({
        languageFamilyId: nullableText,
        peopleId: nullableText,
        countryId: nullableText,
        assertionId: z.string().uuid().nullable(),
      })
      .strict(),
    attribution: z
      .object({
        displayMode: z.enum(["public_name", "pseudonym", "withheld"]),
        displayName: nullableText,
        community: z.string().min(1),
        collector: nullableText,
      })
      .strict(),
    context: z
      .object({
        narrativeDate: z.string().date().nullable(),
        placePrecision: z.enum([
          "exact",
          "locality",
          "region",
          "country",
          "withheld",
        ]),
        languageCode: z.string().regex(/^[a-z]{3}$/),
        narrativeKind: z.enum(["tradition", "testimony", "memory", "story"]),
      })
      .strict(),
    content: z
      .object({
        transcript: nullableText,
        summary: nullableText,
        mediaLocator: nullableText,
      })
      .strict(),
    variantOf: z
      .string()
      .regex(/^ORL_[A-Z0-9_]+$/)
      .nullable(),
    visibility: z.enum(["restricted", "public"]),
    reviewStatus: z.enum(["pending", "approved", "rejected"]),
    rightsStatus: z.enum(["pending", "cleared", "revoked"]),
  })
  .strict()
  .superRefine((narrative, ctx) => {
    const hasFicheLink =
      narrative.links.languageFamilyId !== null ||
      narrative.links.peopleId !== null ||
      narrative.links.countryId !== null;

    if (!hasFicheLink) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["links"],
        message: "at least one fiche link is required",
      });
    }

    if (
      narrative.attribution.displayMode !== "withheld" &&
      narrative.attribution.displayName === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attribution", "displayName"],
        message: "displayName is required unless displayMode is withheld",
      });
    }

    if (
      narrative.content.transcript === null &&
      narrative.content.summary === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "a transcript or summary is required",
      });
    }
  });

export type OralNarrativeDossier = z.infer<typeof oralNarrativeSchema>;

export interface OralNarrativeParseFieldError {
  path: string;
  message: string;
}

export interface ParsedOralNarrativeFile {
  success: boolean;
  data?: OralNarrativeDossier;
  errors?: OralNarrativeParseFieldError[];
}

// @req REQ-095
export function parseOralNarrativeFile(raw: unknown): ParsedOralNarrativeFile {
  const result = oralNarrativeSchema.safeParse(raw);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return { success: true, data: result.data };
}

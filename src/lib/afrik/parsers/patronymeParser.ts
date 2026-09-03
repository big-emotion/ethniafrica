/**
 * Strict parser for per-name PAT_* fiches.
 *
 * This is deliberately separate from PPL_* ethnonym dossiers (`noms/`) and
 * ONS_* naming-system dossiers (`systemes_onomastiques/`). Its discriminant
 * mirrors migration 053 and the public patronyme API exactly.
 */

import { z } from "zod";

import { SOURCE_KINDS, SOURCE_TIERS } from "@/types/sources";
import {
  PATRONYME_NAME_SYSTEMS,
  type PatronymeDossier,
} from "./patronymeTypes";

const sourceRefsSchema = z.array(z.string().min(1)).min(1, {
  message: "at least one source reference is required",
});

const patronymeMetaSchema = z
  .object({
    format: z.literal("AFRIK JSON v2"),
    entity: z.literal("patronyme"),
    directives: z.string().min(1),
    illustrative: z.boolean().optional(),
  })
  .strict();

const patronymeSourceSchema = z
  .object({
    sourceKey: z.string().min(1),
    title: z.string().min(1),
    url: z.url().nullable(),
    tier: z.enum(SOURCE_TIERS, {
      error: `tier must be one of ${SOURCE_TIERS.join(", ")}`,
    }),
    source_kind: z.enum(SOURCE_KINDS).optional(),
    notes: z.string().optional(),
    isSelfIdentification: z.boolean().optional(),
  })
  .strict();

const patronymeAttestationSchema = z
  .object({
    countryId: z.string().regex(/^[A-Z]{3}$/, {
      message: "countryId must be an ISO 3166-1 alpha-3 code",
    }),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const patronymeSpellingSchema = z
  .object({
    spelling: z.string().min(1),
    attestations: z.array(patronymeAttestationSchema).min(1),
  })
  .strict();

const originClaimShape = {
  claim: z.string().min(1),
  claimStatus: z.enum(["claimed", "contested", "established"]),
  sourceRefs: sourceRefsSchema,
};

const patronymeOriginClaimSchema = z.object(originClaimShape).strict();

const patronymeOralOriginClaimSchema = z
  .object({
    ...originClaimShape,
    griot: z.string().min(1),
    transcription: z.string().min(1),
  })
  .strict();

const patronymeOriginSchema = z
  .object({
    oralTraditions: z.array(patronymeOralOriginClaimSchema),
    writtenChronicles: z.array(patronymeOriginClaimSchema),
    linguisticReconstructions: z.array(patronymeOriginClaimSchema),
  })
  .strict();

const patronymePeopleAssociationSchema = z
  .object({
    peopleId: z.string().regex(/^PPL_[A-Z0-9_]+$/, {
      message: "peopleId must match ^PPL_[A-Z0-9_]+$",
    }),
    status: z.enum(["attested", "supposed"]),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const patronymeCountryAssociationSchema = z
  .object({
    countryId: z.string().regex(/^[A-Z]{3}$/, {
      message: "countryId must be an ISO 3166-1 alpha-3 code",
    }),
    status: z.enum(["attested", "supposed"]),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const patronymeAllianceSchema = z
  .object({
    targetPatronymeId: z.string().regex(/^PAT_[A-Z0-9_]+$/, {
      message: "targetPatronymeId must match ^PAT_[A-Z0-9_]+$",
    }),
    allianceType: z.string().min(1),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const patronymeSourcedValueSchema = z
  .object({
    value: z.string().min(1),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const deceasedBearerSchema = z
  .object({
    status: z.literal("deceased"),
    personId: z
      .string()
      .regex(/^PER_[A-Z0-9_]+$/, {
        message: "personId must match ^PER_[A-Z0-9_]+$",
      })
      .nullable()
      .optional(),
    displayName: z.string().min(1).nullable().optional(),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const aggregatedBearerSchema = z
  .object({
    status: z.literal("aggregated"),
    description: z.string().min(1),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const livingSelfIdentifiedBearerSchema = z
  .object({
    status: z.literal("living_self_identified"),
    personId: z.string().regex(/^PER_[A-Z0-9_]+$/, {
      message: "personId must match ^PER_[A-Z0-9_]+$",
    }),
    sourceRefs: sourceRefsSchema,
    selfIdentificationSourceRef: z.string().min(1),
  })
  .strict();

const patronymeBearerSchema = z.discriminatedUnion("status", [
  deceasedBearerSchema,
  aggregatedBearerSchema,
  livingSelfIdentifiedBearerSchema,
]);

const patronymeHomonymSchema = z
  .object({
    label: z.string().min(1),
    entityType: z.enum(["patronyme", "people", "person", "place", "other"]),
    entityId: z
      .union([
        z.string().regex(/^PAT_[A-Z0-9_]+$/),
        z.string().regex(/^PPL_[A-Z0-9_]+$/),
        z.string().regex(/^PER_[A-Z0-9_]+$/),
        z.string().regex(/^[A-Z]{3}$/),
      ])
      .nullable(),
    distinction: z.string().min(1),
    sourceRefs: sourceRefsSchema,
  })
  .strict();

const patronymeGapSchema = z
  .object({
    fieldPath: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

const commonShape = {
  _meta: patronymeMetaSchema,
  id: z.string().regex(/^PAT_[A-Z0-9_]+$/, {
    message: "id must match ^PAT_[A-Z0-9_]+$",
  }),
  nameMain: z.string().min(1),
  spellings: z.array(patronymeSpellingSchema).min(1),
  transmissionMode: z.enum([
    "patrilineal",
    "matrilineal",
    "bilateral",
    "elective",
    "non_hereditary",
    "other",
  ]),
  designatedSocialUnit: z.enum([
    "individual",
    "lineage",
    "clan",
    "caste",
    "age_set",
    "settlement",
    "other",
  ]),
  origin: patronymeOriginSchema,
  peoples: z.array(patronymePeopleAssociationSchema),
  countries: z.array(patronymeCountryAssociationSchema),
  alliances: z.array(patronymeAllianceSchema),
  casteOrSocialFunction: patronymeSourcedValueSchema.nullable(),
  bearers: z.array(patronymeBearerSchema),
  homonyms: z.array(patronymeHomonymSchema),
  sources: z.array(patronymeSourceSchema).min(1),
  gaps: z.array(patronymeGapSchema).min(1, {
    message: "gaps is required and must document at least one research gap",
  }),
};

const clanNameSchema = z
  .object({ ...commonShape, nameSystem: z.literal("clan_name") })
  .strict();

const nonHereditaryPatronymicSchema = z
  .object({
    ...commonShape,
    nameSystem: z.literal("non_hereditary_patronymic"),
    patronymicChainDepth: z
      .object({
        generations: z.number().int().positive(),
        sourceRefs: sourceRefsSchema,
      })
      .strict()
      .optional(),
  })
  .strict();

const nisbaSchema = z
  .object({
    ...commonShape,
    nameSystem: z.literal("nisba"),
    nisbaSubtype: z
      .object({
        value: z.enum(["geographic", "tribal", "occupational", "other"]),
        sourceRefs: sourceRefsSchema,
      })
      .strict()
      .optional(),
  })
  .strict();

const praiseNameSchema = z
  .object({ ...commonShape, nameSystem: z.literal("praise_name") })
  .strict();

const totemicClanSchema = z
  .object({
    ...commonShape,
    nameSystem: z.literal("totemic_clan"),
    totemicFoodProhibition: patronymeSourcedValueSchema.optional(),
    permittedGivenNames: z
      .array(
        z
          .object({
            name: z.string().min(1),
            sourceRefs: sourceRefsSchema,
          })
          .strict()
      )
      .optional(),
  })
  .strict();

function addReferenceIssues(
  dossier: z.infer<typeof patronymeDossierUnionSchema>,
  ctx: z.RefinementCtx
): void {
  const sourcesByKey = new Map(
    dossier.sources.map((source) => [source.sourceKey, source])
  );

  if (sourcesByKey.size !== dossier.sources.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sources"],
      message: "sourceKey values must be unique within a fiche",
    });
  }

  const requireRefs = (refs: string[], path: Array<string | number>) => {
    refs.forEach((ref, index) => {
      if (sourcesByKey.has(ref)) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, index],
        message: `source reference ${ref} does not resolve to sources[].sourceKey`,
      });
    });
  };

  dossier.spellings.forEach((spelling, spellingIndex) => {
    spelling.attestations.forEach((attestation, attestationIndex) => {
      requireRefs(attestation.sourceRefs, [
        "spellings",
        spellingIndex,
        "attestations",
        attestationIndex,
        "sourceRefs",
      ]);
    });
  });

  dossier.origin.oralTraditions.forEach((claim, index) =>
    requireRefs(claim.sourceRefs, [
      "origin",
      "oralTraditions",
      index,
      "sourceRefs",
    ])
  );
  dossier.origin.writtenChronicles.forEach((claim, index) =>
    requireRefs(claim.sourceRefs, [
      "origin",
      "writtenChronicles",
      index,
      "sourceRefs",
    ])
  );
  dossier.origin.linguisticReconstructions.forEach((claim, index) =>
    requireRefs(claim.sourceRefs, [
      "origin",
      "linguisticReconstructions",
      index,
      "sourceRefs",
    ])
  );
  dossier.peoples.forEach((association, index) =>
    requireRefs(association.sourceRefs, ["peoples", index, "sourceRefs"])
  );
  dossier.countries.forEach((association, index) =>
    requireRefs(association.sourceRefs, ["countries", index, "sourceRefs"])
  );
  dossier.alliances.forEach((alliance, index) =>
    requireRefs(alliance.sourceRefs, ["alliances", index, "sourceRefs"])
  );

  if (dossier.casteOrSocialFunction) {
    requireRefs(dossier.casteOrSocialFunction.sourceRefs, [
      "casteOrSocialFunction",
      "sourceRefs",
    ]);
  }

  dossier.bearers.forEach((bearer, index) => {
    requireRefs(bearer.sourceRefs, ["bearers", index, "sourceRefs"]);

    if (bearer.status === "deceased") {
      const hasPerson = !!bearer.personId;
      const hasEmbeddedName = !!bearer.displayName?.trim();
      if (hasPerson === hasEmbeddedName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bearers", index],
          message:
            "a deceased bearer must use exactly one of personId or displayName",
        });
      }
    }

    if (bearer.status === "living_self_identified") {
      const selfIdentificationSource = sourcesByKey.get(
        bearer.selfIdentificationSourceRef
      );
      if (
        !bearer.sourceRefs.includes(bearer.selfIdentificationSourceRef) ||
        selfIdentificationSource?.isSelfIdentification !== true
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bearers", index, "selfIdentificationSourceRef"],
          message:
            "a living bearer requires a cited source explicitly marked as public self-identification (DEC-040)",
        });
      }
    }
  });

  dossier.homonyms.forEach((homonym, index) =>
    requireRefs(homonym.sourceRefs, ["homonyms", index, "sourceRefs"])
  );

  if (dossier.nameSystem === "non_hereditary_patronymic") {
    if (dossier.patronymicChainDepth) {
      requireRefs(dossier.patronymicChainDepth.sourceRefs, [
        "patronymicChainDepth",
        "sourceRefs",
      ]);
    }
  }
  if (dossier.nameSystem === "nisba" && dossier.nisbaSubtype) {
    requireRefs(dossier.nisbaSubtype.sourceRefs, [
      "nisbaSubtype",
      "sourceRefs",
    ]);
  }
  if (dossier.nameSystem === "totemic_clan") {
    if (dossier.totemicFoodProhibition) {
      requireRefs(dossier.totemicFoodProhibition.sourceRefs, [
        "totemicFoodProhibition",
        "sourceRefs",
      ]);
    }
    dossier.permittedGivenNames?.forEach((name, index) =>
      requireRefs(name.sourceRefs, ["permittedGivenNames", index, "sourceRefs"])
    );
  }
}

const patronymeDossierUnionSchema = z.discriminatedUnion("nameSystem", [
  clanNameSchema,
  nonHereditaryPatronymicSchema,
  nisbaSchema,
  praiseNameSchema,
  totemicClanSchema,
]);

// @req REQ-133
// @req REQ-134
export const patronymeDossierSchema =
  patronymeDossierUnionSchema.superRefine(addReferenceIssues);

export interface PatronymeParseFieldError {
  path: string;
  message: string;
}

export interface ParsedPatronymeFile {
  success: boolean;
  data?: PatronymeDossier;
  errors?: PatronymeParseFieldError[];
}

function formatIssues(error: z.ZodError): PatronymeParseFieldError[] {
  return error.issues.flatMap((issue) => {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      return issue.keys.map((key) => ({
        path: [...issue.path, key].join("."),
        message: `unrecognized key: ${key}`,
      }));
    }
    return [{ path: issue.path.join("."), message: issue.message }];
  });
}

// @req REQ-133
// @req REQ-134
export function parsePatronymeFile(raw: unknown): ParsedPatronymeFile {
  const result = patronymeDossierSchema.safeParse(raw);

  if (!result.success) {
    return { success: false, errors: formatIssues(result.error) };
  }

  // strictNullChecks is disabled project-wide; safeParse establishes the
  // complete discriminated-union shape before this cast.
  return { success: true, data: result.data as PatronymeDossier };
}

export { PATRONYME_NAME_SYSTEMS };

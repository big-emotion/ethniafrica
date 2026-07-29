/**
 * Zod schemas for GET /v2/peoples/{id}/fragmentation (Epic 13, FR85).
 *
 * Derives a people's colonial-border fragmentation from data already in
 * production (`afrik_people_countries` + `content.demography.distributionByCountry`).
 * `colonialOrigin` is optional/additive (NFR31): the colonial-borders dataset
 * (Story 13.3) does not exist yet, so it is never populated today.
 */

import { z } from "zod";

export const peopleFragmentationParamSchema = z.object({
  id: z.string().regex(/^PPL_[A-Z0-9_]+$/, {
    message: "Invalid people id format (expected PPL_*)",
  }),
});

export type PeopleFragmentationParam = z.infer<
  typeof peopleFragmentationParamSchema
>;

export const fragmentationCountrySchema = z.object({
  iso3: z.string().length(3),
  nameFr: z.string(),
  populationShare: z.number().min(0).max(1),
  /**
   * Assertions are field-scoped and only exist once a fiche has gone through
   * the contribution/revision workflow (Module #0 fabric) — bulk-migrated
   * fiches may have none yet. Present but nullable: we surface what exists,
   * never invent it.
   */
  assertionId: z.string().nullable(),
});

export type FragmentationCountry = z.infer<typeof fragmentationCountrySchema>;

export const colonialOriginSchema = z.object({
  layerId: z.string(),
  sourceIds: z.array(z.string()),
});

export type ColonialOrigin = z.infer<typeof colonialOriginSchema>;

export const borderPairSchema = z.object({
  a: z.string().length(3),
  b: z.string().length(3),
  colonialOrigin: colonialOriginSchema.optional(),
});

export type BorderPair = z.infer<typeof borderPairSchema>;

export const peopleFragmentationSchema = z.object({
  peopleId: z.string(),
  autonym: z.string().nullable(),
  exonym: z.string().nullable(),
  countryCount: z.number().int().min(2),
  countries: z.array(fragmentationCountrySchema),
  borderPairs: z.array(borderPairSchema),
});

export type PeopleFragmentation = z.infer<typeof peopleFragmentationSchema>;

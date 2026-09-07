/**
 * Zod schemas for `GET /v2/patronymes/{id}` (ETNI-1462, REQ-133 — DEC-038's
 * fifth corpus dimension, internally the patronyme; distinct from
 * `/v2/names` (name_records, the ethnonym dossier).
 *
 * `afrik_patronymes` (migration 053) pulls only `name_system` and
 * `caste_or_social_function` out of `content` as real columns; every other
 * DEC-039 field (attestedForms, origin, transmissionMode, ...) stays in
 * `content` until ETNI-1460's per-subtype strict shape lands, so `content`
 * is forwarded opaquely here rather than re-typed ahead of that ticket.
 *
 * Bearers (`afrik_patronyme_persons` -> `persons`, migration 063) are
 * deliberately a narrow summary — DEC-040 forbids any code path that takes a
 * family name and returns an ethnic origin for a named living person, so a
 * bearer entry never carries `peopleLinks`, `countryIds` or `content`.
 */

import { z } from "zod";

// @req REQ-133
export const patronymeIdParamSchema = z.object({
  id: z.string().regex(/^PAT_[A-Z0-9_]+$/, {
    message: "Invalid patronyme id format (expected PAT_*)",
  }),
});

export type PatronymeIdParam = z.infer<typeof patronymeIdParamSchema>;

// @req REQ-133
export const patronymeNameSystemSchema = z.enum([
  "clan_name",
  "non_hereditary_patronymic",
  "nisba",
  "praise_name",
  "totemic_clan",
]);

export type PatronymeNameSystem = z.infer<typeof patronymeNameSystemSchema>;

/** Lightweight people reference embedded in a patronyme dossier. */
// @req REQ-133
export const patronymePeopleSummarySchema = z.object({
  id: z.string(),
  nameMain: z.string(),
  autonym: z.string().nullable(),
  slug: z.string(),
});

export type PatronymePeopleSummary = z.infer<
  typeof patronymePeopleSummarySchema
>;

/** Lightweight country reference embedded in a patronyme dossier. */
// @req REQ-133
export const patronymeCountrySummarySchema = z.object({
  id: z.string(),
  nameFr: z.string(),
});

export type PatronymeCountrySummary = z.infer<
  typeof patronymeCountrySummarySchema
>;

/**
 * A name's bearer. Deliberately minimal (DEC-040): no `peopleLinks`, no
 * `countryIds`, no `content` — nothing that lets a reader derive this named
 * person's ethnic origin from the fact that they bear this patronyme.
 */
// @req REQ-133
export const patronymeBearerSummarySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  roleCategory: z.string(),
});

export type PatronymeBearerSummary = z.infer<
  typeof patronymeBearerSummarySchema
>;

/**
 * A name this name is allied with, resolved to something a reader can read.
 *
 * The corpus writes `alliances[].targetPatronymeId`. Forwarding the id alone
 * put "PAT_COULIBALY" on the Keïta fiche as link text — the raw corpus
 * identifier the reader-facing register forbids in prose, printed by the
 * view instead of by a curator. The target's name is resolved here, once per
 * fiche, so no surface has to look it up and none can fall back to the id.
 */
// Not exported: its type is, and nothing outside this file parses an
// alliance on its own — an unused export is what the dead-code ratchet counts.
const patronymeAllianceSummarySchema = z.object({
  targetId: z.string(),
  targetNameMain: z.string(),
  /** The attested term (sanankuya, …), never a category of our own. */
  allianceType: z.string().nullable(),
});

export type PatronymeAllianceSummary = z.infer<
  typeof patronymeAllianceSummarySchema
>;

// @req REQ-133
export const publicPatronymeSchema = z.object({
  id: z.string(),
  nameMain: z.string(),
  nameSystem: patronymeNameSystemSchema,
  casteOrSocialFunction: z.string().nullable(),
  content: z.record(z.string(), z.unknown()),
  associatedPeoples: z.array(patronymePeopleSummarySchema),
  associatedCountries: z.array(patronymeCountrySummarySchema),
  bearers: z.array(patronymeBearerSummarySchema),
  alliances: z.array(patronymeAllianceSummarySchema),
});

export type PublicPatronyme = z.infer<typeof publicPatronymeSchema>;

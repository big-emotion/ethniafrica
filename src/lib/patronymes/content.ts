import { type SourceTier, isSourceTier } from "@/types/sources";

/**
 * Readers for `PublicPatronyme.content` (REQ-133).
 *
 * `content` is forwarded opaquely by the API — `afrik_patronymes` only pulls
 * `name_system` and `caste_or_social_function` into real columns, and every
 * other field named by ETNI-1464's naming-subtype taxonomy
 * (`docs/design/naming-subtype-taxonomy.md`) stays inside the JSONB bag until
 * ETNI-1460's per-subtype strict shape lands. Until then this is the one
 * place the frontend interprets that bag, defensively: an unrecognised or
 * malformed value reads as absent rather than as a guess, the same posture
 * `toSourceTier` takes for an unrecognised source tier.
 *
 * `patronymicChainDepth` (the `patronymic_chain` subtype field) is
 * deliberately not read here: the taxonomy doc's subtype value
 * (`patronymic_chain`) does not match the shipped `nameSystem` enum
 * (`non_hereditary_patronymic`), and guessing at that mapping would render a
 * field under a system it may not belong to.
 */

type ContentBag = Record<string, unknown>;

export interface PatronymeSource {
  title: string;
  url: string | null;
  tier: SourceTier;
  notes?: string | null;
}

/**
 * One attested spelling and the countries it is attested in.
 *
 * The corpus writes `spellings[]`, each entry pairing a spelling with the
 * countries attesting it and the source keys backing each attestation. The
 * fiche read `attestedForms[]` instead — a key no model and no dossier has
 * ever carried — so the richest field the name corpus has, filled on 30
 * dossiers out of 30, reached no reader.
 */
export interface AttestedSpelling {
  spelling: string;
  countryIds: string[];
}

export type TransmissionMode =
  | "patrilineal"
  | "matrilineal"
  | "bilateral"
  | "elective"
  // Written by 4 dossiers and missing from this list, which blanked the
  // transmission mode on every one of them.
  | "non_hereditary"
  | "other";

const TRANSMISSION_MODES: TransmissionMode[] = [
  "patrilineal",
  "matrilineal",
  "bilateral",
  "elective",
  "non_hereditary",
  "other",
];

export type DesignatedSocialUnit =
  | "individual"
  | "lineage"
  | "clan"
  | "caste"
  | "age_set"
  | "settlement"
  | "other";

const DESIGNATED_SOCIAL_UNITS: DesignatedSocialUnit[] = [
  "individual",
  "lineage",
  "clan",
  "caste",
  "age_set",
  "settlement",
  "other",
];

/**
 * Where a name is said to come from.
 *
 * The corpus writes three parallel lists rather than one discriminated
 * `originType`, so a fiche can carry an oral tradition and a written
 * chronicle at once without either overruling the other — which is the point:
 * a griot's account and a colonial chronicle are two testimonies, not one
 * winning classification. The reader looked for `origin.originType`, found a
 * shape that does not exist, and returned null.
 */
export interface OriginAccount {
  claim: string;
  claimStatus: "claimed" | "contested" | "established" | null;
  griot: string | null;
  transcription: string | null;
}

export interface PatronymeOrigin {
  oralTraditions: OriginAccount[];
  writtenChronicles: OriginAccount[];
  linguisticReconstructions: OriginAccount[];
}

export interface PatronymeAlliance {
  targetPatronymeId: string;
  allianceType: string | null;
}

export interface PatronymeHomonym {
  label: string;
  entityType: string | null;
  distinction: string | null;
}

/** One `gaps[]` entry: a field path, and why the corpus leaves it empty. */
export interface PatronymeGap {
  fieldPath: string;
  reason: string;
}

export type NisbaSubtype = "geographic" | "tribal" | "occupational" | "other";

const NISBA_SUBTYPES: NisbaSubtype[] = [
  "geographic",
  "tribal",
  "occupational",
  "other",
];

function isPlainObject(value: unknown): value is ContentBag {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSource(value: unknown): PatronymeSource | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.title !== "string") return null;
  return {
    title: value.title,
    url: typeof value.url === "string" ? value.url : null,
    tier: isSourceTier(value.tier) ? value.tier : "unverified",
    ...(typeof value.notes === "string" ? { notes: value.notes } : {}),
  };
}

function readSources(value: unknown): PatronymeSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(readSource)
    .filter((source): source is PatronymeSource => source !== null);
}

function readStringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

// @req REQ-133
export function readSpellings(content: ContentBag): AttestedSpelling[] {
  const value = content.spellings;
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ContentBag =>
        isPlainObject(entry) && typeof entry.spelling === "string"
    )
    .map((entry) => ({
      spelling: entry.spelling as string,
      countryIds: Array.isArray(entry.attestations)
        ? Array.from(
            new Set(
              entry.attestations
                .filter(isPlainObject)
                .map((attestation) => attestation.countryId)
                .filter(
                  (countryId): countryId is string =>
                    typeof countryId === "string"
                )
            )
          )
        : [],
    }));
}

// @req REQ-133
export function readPatronymeSources(content: ContentBag): PatronymeSource[] {
  return readSources(content.sources);
}

// @req REQ-133
export function readGaps(content: ContentBag): PatronymeGap[] {
  const value = content.gaps;
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ContentBag =>
        isPlainObject(entry) &&
        typeof entry.fieldPath === "string" &&
        typeof entry.reason === "string"
    )
    .map((entry) => ({
      fieldPath: entry.fieldPath as string,
      reason: entry.reason as string,
    }));
}

// @req REQ-133
export function readAlliances(content: ContentBag): PatronymeAlliance[] {
  const value = content.alliances;
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ContentBag =>
        isPlainObject(entry) && typeof entry.targetPatronymeId === "string"
    )
    .map((entry) => ({
      targetPatronymeId: entry.targetPatronymeId as string,
      allianceType: readStringField(entry.allianceType),
    }));
}

// @req REQ-133
export function readHomonyms(content: ContentBag): PatronymeHomonym[] {
  const value = content.homonyms;
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ContentBag =>
        isPlainObject(entry) && typeof entry.label === "string"
    )
    .map((entry) => ({
      label: entry.label as string,
      entityType: readStringField(entry.entityType),
      distinction: readStringField(entry.distinction),
    }));
}

// @req REQ-133
export function readTransmissionMode(
  content: ContentBag
): TransmissionMode | null {
  const value = content.transmissionMode;
  return typeof value === "string" &&
    TRANSMISSION_MODES.includes(value as TransmissionMode)
    ? (value as TransmissionMode)
    : null;
}

// @req REQ-133
export function readDesignatedSocialUnit(
  content: ContentBag
): DesignatedSocialUnit | null {
  const value = content.designatedSocialUnit;
  return typeof value === "string" &&
    DESIGNATED_SOCIAL_UNITS.includes(value as DesignatedSocialUnit)
    ? (value as DesignatedSocialUnit)
    : null;
}

const CLAIM_STATUSES = ["claimed", "contested", "established"];

function readOriginAccounts(value: unknown): OriginAccount[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ContentBag =>
        isPlainObject(entry) && typeof entry.claim === "string"
    )
    .map((entry) => ({
      claim: entry.claim as string,
      claimStatus:
        typeof entry.claimStatus === "string" &&
        CLAIM_STATUSES.includes(entry.claimStatus)
          ? (entry.claimStatus as OriginAccount["claimStatus"])
          : null,
      griot: readStringField(entry.griot),
      transcription: readStringField(entry.transcription),
    }));
}

// @req REQ-133
export function readOrigin(content: ContentBag): PatronymeOrigin {
  const value = isPlainObject(content.origin) ? content.origin : {};
  return {
    oralTraditions: readOriginAccounts(value.oralTraditions),
    writtenChronicles: readOriginAccounts(value.writtenChronicles),
    linguisticReconstructions: readOriginAccounts(
      value.linguisticReconstructions
    ),
  };
}

// @req REQ-133
export function readTotemicFoodProhibition(content: ContentBag): string | null {
  const value = content.totemicFoodProhibition;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

// @req REQ-133
export function readPermittedGivenNames(content: ContentBag): string[] {
  const value = content.permittedGivenNames;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

// @req REQ-133
export function readNisbaSubtype(content: ContentBag): NisbaSubtype | null {
  const value = content.nisbaSubtype;
  return typeof value === "string" &&
    NISBA_SUBTYPES.includes(value as NisbaSubtype)
    ? (value as NisbaSubtype)
    : null;
}

/*
 * `readFiliationClaims` is deliberately gone. It read `content.filiationClaims`,
 * a key that appears in no model, no parser and no dossier, so the section
 * depending on it was structurally unreachable. What the corpus documents
 * instead is `origin.oralTraditions[].claim`, which `readOrigin` now returns.
 */

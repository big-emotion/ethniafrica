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

export interface AttestedForm {
  spelling: string;
  attestation: PatronymeSource | null;
}

export type TransmissionMode =
  | "patrilineal"
  | "matrilineal"
  | "bilateral"
  | "elective"
  | "other";

const TRANSMISSION_MODES: TransmissionMode[] = [
  "patrilineal",
  "matrilineal",
  "bilateral",
  "elective",
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

export type OriginType =
  | "griot_oral_tradition"
  | "written_chronicle"
  | "linguistic_reconstruction";

const ORIGIN_TYPES: OriginType[] = [
  "griot_oral_tradition",
  "written_chronicle",
  "linguistic_reconstruction",
];

export interface PatronymeOrigin {
  originType: OriginType;
  sources: PatronymeSource[];
  griot: string | null;
}

export type NisbaSubtype = "geographic" | "tribal" | "occupational" | "other";

const NISBA_SUBTYPES: NisbaSubtype[] = [
  "geographic",
  "tribal",
  "occupational",
  "other",
];

export interface FiliationClaim {
  claim: string;
  competingAccount: string | null;
  sources: PatronymeSource[];
}

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
    notes: typeof value.notes === "string" ? value.notes : null,
  };
}

function readSources(value: unknown): PatronymeSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(readSource)
    .filter((source): source is PatronymeSource => source !== null);
}

// @req REQ-133
export function readAttestedForms(content: ContentBag): AttestedForm[] {
  const value = content.attestedForms;
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ContentBag =>
        isPlainObject(entry) && typeof entry.spelling === "string"
    )
    .map((entry) => ({
      spelling: entry.spelling as string,
      attestation: readSource(entry.attestation),
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

// @req REQ-133
export function readOrigin(content: ContentBag): PatronymeOrigin | null {
  const value = content.origin;
  if (!isPlainObject(value)) return null;
  const originType = value.originType;
  if (
    typeof originType !== "string" ||
    !ORIGIN_TYPES.includes(originType as OriginType)
  ) {
    return null;
  }
  return {
    originType: originType as OriginType,
    sources: readSources(value.sources),
    griot: typeof value.griot === "string" ? value.griot : null,
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

// @req REQ-133
export function readFiliationClaims(content: ContentBag): FiliationClaim[] {
  const value = content.filiationClaims;
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ContentBag =>
        isPlainObject(entry) && typeof entry.claim === "string"
    )
    .map((entry) => ({
      claim: entry.claim as string,
      competingAccount:
        typeof entry.competingAccount === "string"
          ? entry.competingAccount
          : null,
      sources: readSources(entry.sources),
    }));
}

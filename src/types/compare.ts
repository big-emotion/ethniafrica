/**
 * Compare Types
 *
 * Type-safe contract shared by the comparisonDataTransformer and every
 * downstream comparator surface (page, API, OG card). Sections mirror the
 * strict-model content keys for each entity type (public/modele-*.json) —
 * no derived/computed fields belong in this shape.
 */

import type {
  CountryId,
  LanguageFamilyId,
  PeopleId,
  AppellationsSection,
  OriginsSection,
  OrganizationSection,
  LanguagesSection,
  DetailedCultureSection,
  HistoricalRoleSection,
  GlobalDemographySection,
  HistoricalNamesSection,
  Kingdom,
  MajorPeopleEntry,
  CultureSection,
  HistoricalFactsSection,
  DemographicsSection,
  DecolonialHeader,
  PeopleReference,
} from "./afrik";

// ==========================================
// ENTITY PAYLOADS
// ==========================================

export interface ComparePeopleEntity {
  type: "peuple";
  id: PeopleId;
  label: string;
  appellations?: AppellationsSection;
  origins?: OriginsSection;
  organization?: OrganizationSection;
  languages?: LanguagesSection;
  culture?: DetailedCultureSection;
  historicalRole?: HistoricalRoleSection;
  demography?: GlobalDemographySection;
}

export interface CompareCountryEntity {
  type: "pays";
  id: CountryId;
  label: string;
  historicalNames?: HistoricalNamesSection;
  kingdoms?: Kingdom[];
  majorPeoples?: MajorPeopleEntry[];
  culture?: CultureSection;
  historicalFacts?: HistoricalFactsSection;
  demographics?: DemographicsSection;
}

export interface CompareFamilyEntity {
  type: "famille";
  id: LanguageFamilyId;
  label: string;
  decolonialHeader?: DecolonialHeader;
  generalInfo?: {
    branches?: string[];
    geographicArea?: string;
    numberOfLanguages?: number;
    totalSpeakers?: number;
  };
  associatedPeoples?: PeopleReference[];
  linguisticCharacteristics?: {
    typology?: string;
    phonologicalFeatures?: string;
    relationsWithNeighbors?: string;
    keyInnovations?: string;
  };
  historyAndOrigins?: {
    probableOrigin?: string;
    emergencePeriod?: string;
    diffusion?: string;
    historicalBreaks?: string;
    contactZones?: string;
    majorEvents?: string;
  };
  distribution?: {
    totalSpeakers?: number;
    distributionByCountry?: Record<CountryId, number>;
  };
}

export type CompareEntityPayload =
  | ComparePeopleEntity
  | CompareCountryEntity
  | CompareFamilyEntity;

export type CompareEntityType = CompareEntityPayload["type"];

// ==========================================
// COMPARABLE ROWS REGISTRY
// ==========================================

/**
 * Per-entity-type registry of comparable field keys, derived from the
 * strict-model `content` keys (minus `sources`, which is a citation list,
 * not a comparable value).
 */
// @req REQ-097
export const COMPARABLE_ROWS: Record<CompareEntityType, readonly string[]> = {
  peuple: [
    "appellations",
    "origins",
    "organization",
    "languages",
    "culture",
    "historicalRole",
    "demography",
  ],
  pays: [
    "historicalNames",
    "kingdoms",
    "majorPeoples",
    "culture",
    "historicalFacts",
    "demographics",
  ],
  famille: [
    "decolonialHeader",
    "generalInfo",
    "associatedPeoples",
    "linguisticCharacteristics",
    "historyAndOrigins",
    "distribution",
  ],
} as const;

// ==========================================
// OUTPUT SHAPE
// ==========================================

export interface ComparisonColumn {
  id: string;
  label: string;
  type: CompareEntityType;
}

/**
 * One comparable field. `values` is keyed by entity id; a missing section
 * on a given entity is an explicit `null` (the key is always present).
 */
export interface ComparisonRow {
  key: string;
  values: Record<string, unknown | null>;
}

export interface ComparisonPageData {
  type: CompareEntityType;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

// ==========================================
// ERRORS
// ==========================================

export type ComparisonInputErrorReason =
  | "MIXED_TYPES"
  | "INVALID_COUNT"
  | "DUPLICATE_IDS";

// @req REQ-097
export class ComparisonInputError extends Error {
  readonly reason: ComparisonInputErrorReason;

  constructor(reason: ComparisonInputErrorReason, message: string) {
    super(message);
    this.name = "ComparisonInputError";
    this.reason = reason;
  }
}

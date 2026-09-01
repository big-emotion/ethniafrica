/**
 * AFRIK Types - TypeScript type definitions for AFRIK data structure
 *
 * Core principle: STABLE identifiers + EVOLUTIONARY content
 * - Identifiers (FLG_, PPL_, ISO codes) are IMMUTABLE and serve as primary keys
 * - Content sections are stored in JSONB for flexibility and evolution
 * - New sections can be added to TXT files without schema migration
 */

import type { SourceTier } from "@/types/sources";
import type { PersonId, PersonPeopleLink } from "@/types/persons";

// ==========================================
// STABLE IDENTIFIERS (IMMUTABLE)
// ==========================================

/**
 * ISO 3166-1 alpha-3 country code
 * Examples: "ZWE", "COM", "CMR"
 */
export type CountryId = string;

/**
 * Language family identifier
 * Format: FLG_xxxxx
 * Examples: "FLG_BANTU", "FLG_MANDE", "FLG_AFROASIATIC"
 */
export type LanguageFamilyId = string;

/**
 * ISO 639-3 language code
 * Examples: "sna", "lin", "kin", "swa"
 */
export type LanguageId = string;

/**
 * People identifier
 * Format: PPL_xxxxx
 * Examples: "PPL_SHONA", "PPL_COMORIEN", "PPL_BAMBARA"
 */
export type PeopleId = string;

// ==========================================
// CLASSIFICATION STATUS
// ==========================================

/**
 * Epistemic status of a classification.
 * Mirrors the `classification_status` enum defined in migration 009.
 *
 * - `consensual`: Widely accepted classification among scholars
 * - `contested`: Classification that is debated among scholars
 * - `colonial-legacy`: Classification inherited from colonial-era categorizations
 * - `reconstructive`: Classification being actively reconstructed / decolonized
 */
export type ClassificationStatus =
  | "consensual"
  | "contested"
  | "colonial-legacy"
  | "reconstructive";

// ==========================================
// CORE ENTITIES (with stable IDs)
// ==========================================

/**
 * Country entity
 * Stable fields: id, name, etymology
 * Variable content: stored in JSONB
 */
export interface Country {
  id: CountryId; // ISO 3166-1 alpha-3 (IMMUTABLE)
  nameFr: string;
  nameOfficial?: string;
  /**
   * The chapeau: what a reader takes away if they read nothing else.
   * It restates the fiche and never adds to it, which is why it carries no
   * sources of its own — a summary that introduced a claim would need them.
   */
  summary?: string;
  etymology?: string;
  nameOriginActor?: string; // Person/people/administration who named it

  // Variable content stored in JSONB (evolutionary)
  content: CountryContent;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Language Family entity
 * Stable fields: id, name
 * Variable content: stored in JSONB
 */
export interface LanguageFamily {
  id: LanguageFamilyId; // FLG_xxxxx (IMMUTABLE)
  nameFr: string;
  nameEn?: string;

  associatedPeoples?: PeopleReference[];

  // Editorial classification status (migration 009)
  classificationStatus?: ClassificationStatus | null;

  /**
   * Number of afrik_peoples rows whose language_family_id matches this
   * family, computed from stored rows (REQ-108) — not the fiche-declared
   * content.associatedPeoples length.
   */
  peopleCount?: number;

  /**
   * Country presence reconstructed from the stored `currentCountries` of
   * every people carrying this family's id — the union the atlas charter
   * calls the family's "footprint" (docs/design/atlas-charter.md §1). Always
   * derived, never the fiche's own declared `content.distribution` (REQ-119).
   */
  footprintByCountry?: Record<CountryId, number>;

  // Variable content stored in JSONB (evolutionary)
  content: LanguageFamilyContent;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Language entity
 * Stable fields: id (ISO 639-3), name, familyId
 * Variable content: stored in JSONB
 */
export interface Language {
  id: LanguageId; // ISO 639-3 (IMMUTABLE)
  name: string;
  familyId: LanguageFamilyId; // FLG_xxxxx

  // Variable content stored in JSONB (evolutionary)
  content: LanguageContent;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * People entity
 * Stable fields: id, nameMain, languageFamilyId, currentCountries
 * Variable content: stored in JSONB
 */
export interface People {
  id: PeopleId; // PPL_xxxxx (IMMUTABLE)
  nameMain: string;

  // Critical relations
  languageFamilyId: LanguageFamilyId; // FLG_xxxxx
  currentCountries: CountryId[]; // ISO codes

  // Editorial classification status (migration 009)
  classificationStatus?: ClassificationStatus | null;

  // Variable content stored in JSONB (evolutionary)
  content: PeopleContent;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

// ==========================================
// EVOLUTIONARY CONTENT (JSONB)
// ==========================================

/**
 * A `sources[]` entry on a peuple, pays or famille fiche, as emitted by
 * `scripts/codemods/tierStringSources.ts`.
 *
 * `needs_review` is deliberately NOT a `SourceTier`: the doctrine is that
 * every source carries an explicit tier, and `needs_review` marks the tail
 * that has not been ruled on yet — the count the coverage gate ratchets to
 * zero. It lives here, at the corpus boundary, and never in the canonical
 * union.
 *
 * The nom, relation, migration and frontière-coloniale fiches still carry the
 * numeric tier `1 | 2` (see `public/modele-source.json`); their loaders
 * normalise it through `sourceTierFromLegacyNumber`.
 */
export interface FicheSource {
  title: string;
  url: string | null;
  tier: SourceTier | "needs_review";
  notes?: string;
}

/**
 * Country content (evolutionary)
 * All sections from modele-pays.txt stored here
 * New sections can be added without schema migration
 */
export interface CountryContent {
  // Section 1: Historical names and origins
  historicalNames?: HistoricalNamesSection;

  // Section 2: Civilizations, kingdoms, political entities
  kingdoms?: Kingdom[];

  // Section 3: Major peoples
  majorPeoples?: MajorPeopleEntry[];

  // Section 5: Culture, lifestyle, languages, spirituality
  culture?: CultureSection;

  // Section 6: Major historical facts
  historicalFacts?: HistoricalFactsSection;

  // Section 7: Sources
  sources?: FicheSource[];

  // Demographics data
  demographics?: DemographicsSection;

  // Allow new sections to be added dynamically
  [key: string]: unknown;
}

/**
 * Language Family content (evolutionary)
 * All sections from modele-linguistique.txt stored here
 */
export interface LanguageFamilyContent {
  // Decolonial header (mandatory)
  decolonialHeader?: DecolonialHeader;

  // Section 1: General information
  generalInfo?: {
    branches?: string[];
    geographicArea?: string;
    numberOfLanguages?: number;
    totalSpeakers?: number;
  };

  // Section 2: Associated peoples
  associatedPeoples?: PeopleReference[];

  // Section 3: Linguistic characteristics
  linguisticCharacteristics?: {
    typology?: string;
    phonologicalFeatures?: string;
    relationsWithNeighbors?: string;
    keyInnovations?: string;
  };

  // Section 4: History and origins
  historyAndOrigins?: {
    probableOrigin?: string;
    emergencePeriod?: string;
    diffusion?: string;
    historicalBreaks?: string;
    contactZones?: string;
    majorEvents?: string;
  };

  // Section 5: Geographic distribution and demography
  distribution?: {
    totalSpeakers?: number;
    distributionByCountry?: Record<CountryId, number>;
  };

  // Section 6: Sources
  sources?: FicheSource[];

  // Allow new sections
  [key: string]: unknown;
}

/**
 * Language content (evolutionary)
 */
export interface LanguageContent {
  dialects?: string[];
  speakers?: number;
  script?: string;
  status?: string;
  spellingAliases?: string[]; // Alternate spellings of the same name (DEC-034)

  // Allow new sections
  [key: string]: unknown;
}

/**
 * People content (evolutionary)
 * All sections from modele-peuple.txt stored here
 */
export interface PeopleContent {
  // Header: Appellations
  appellations?: AppellationsSection;

  // Section 1: Ethnicities included
  ethnicities?: string[];

  // Section 2: Origins, migrations, formation
  origins?: OriginsSection;

  // Section 3: Organization and internal structure
  organization?: OrganizationSection;

  // Section 4: Languages and sub-families
  languages?: LanguagesSection;

  // Section 5: Culture, rites, traditions
  culture?: DetailedCultureSection;

  // Section 6: Historical role and regional interactions
  historicalRole?: HistoricalRoleSection;

  // Section 7: Global demography
  demography?: GlobalDemographySection;

  // Section 8: Sources
  sources?: FicheSource[];

  // Allow new sections
  [key: string]: unknown;
}

// ==========================================
// SECTION TYPES (known structure)
// ==========================================

export interface HistoricalNamesSection {
  /**
   * The names themselves, as a list.
   *
   * The five period fields below are prose — they narrate how a territory
   * was designated, which is not the same thing as naming it. A surface
   * that wants to print "Haute-Volta (1919-1960)" as a chip cannot get it
   * out of a paragraph, so the list is held separately. Every entry is
   * lifted from that same prose and adds nothing to it.
   */
  formerNames?: string[];
  antiquity?: string;
  middleAges?: string;
  precolonial?: string;
  colonization?: string;
  contemporary?: string;
}

export interface Kingdom {
  name: string;
  period?: string;
  dominantPeoples?: string[];
  politicalCenters?: string[];
  historicalRole?: string;
}

export interface MajorPeopleEntry {
  name: string;
  selfAppellation?: string;
  exonyms?: string[];
  peopleId?: PeopleId;
  mainRegion?: string;
  languages?: string[];
  languageFamily?: LanguageFamilyId;
  appellationRemarks?: string; // Derogatory terms / self-appellation notes
}

export interface CultureSection {
  mainLanguages?: LanguageReference[];
  culturalTraditions?: string;
  dominantReligions?: string;
  lifestyles?: string;
  socialOrganization?: string;
  regionalRelations?: string;
}

export interface HistoricalFactsSection {
  ancientPeriods?: string;
  middleAges?: string;
  precolonial?: string;
  colonization?: string;
  independenceStruggle?: string;
  postIndependence?: string;
}

export interface DemographicsSection {
  /** Official country population, independently of people-level coverage. */
  totalPopulation?: number;
  /** Reference year of `totalPopulation`. */
  referenceYear?: number;
  /** Human-readable provenance matching a structured country source. */
  source?: string;
  peoples?: PeopleDemographicEntry[];
}

export interface PeopleDemographicEntry {
  name: string;
  peopleId?: PeopleId;
  population?: number;
  /**
   * Year `population` was counted, when it is not the atlas's own 2025 — a
   * census headcount is dated by its census. FR32 reads the value against the
   * country total of this year; absent, it reads against 2025.
   */
  referenceYear?: number;
  percentageInCountry?: number;
  percentageInAfrica?: number;
  region?: string;
  languageFamily?: LanguageFamilyId;
  mainLanguageCode?: LanguageId;
}

/**
 * Decolonial header (mandatory for language families)
 */
export interface DecolonialHeader {
  linkWithFamily?: string;
  nameFr?: string;
  nameEn?: string;
  historicalAppellations?: string[];
  originOfHistoricalTerm?: string;
  whyProblematic?: string;
  selfAppellation?: string;
  contemporaryUsage?: string;
  geographicArea?: string;
  numberOfLanguages?: number;
  totalSpeakers?: number;
}

export interface PeopleReference {
  name: string;
  peopleId?: PeopleId;
}

/**
 * Appellations section (with decolonial sensitivity)
 */
export interface AppellationsSection {
  mainName: string;
  selfAppellation: string; // Endonym
  exonyms?: string[]; // Historical names
  spellingAliases?: string[]; // Alternate spellings of the same name (DEC-034)
  originOfExonyms?: string;
  whyProblematic?: string; // Why some terms are problematic
  contemporaryUsage?: string;
  linguisticFamily?: LanguageFamilyId;
  ethnoLinguisticGroup?: string;
  historicalRegion?: string;
  currentCountries?: CountryId[];
}

export interface OriginsSection {
  ancientOrigins?: string;
  formationPeriod?: string;
  migrationRoutes?: string[];
  historicalSettlementZones?: string[];
  unificationsOrDivisions?: string;
  externalInfluences?: string;
  majorHistoricalEvents?: string;
}

export interface OrganizationSection {
  traditionalPoliticalSystem?: string;
  clanOrganization?: string;
  ageClassSystems?: string;
  roleOfLineages?: string;
  religiousAuthority?: string;
}

export interface LanguagesSection {
  mainLanguage?: string;
  isoCodes?: LanguageId[];
  dialects?: string[];
  vehicularRole?: string;
}

/**
 * `content.culture`, exactly as `public/modele-peuple.json` declares it: four
 * prose fields, no nesting.
 *
 * This interface used to describe a six-part nested structure — divinities,
 * cosmology, person and nature, rites, symbols, contemporary spiritualities —
 * together with nineteen sub-interfaces. No fiche ever carried it. The TXT
 * parser flattened those subsections into the four keys below before the
 * corpus was written to JSON, so all 789 peuples files fill exactly these and
 * nothing else. Every nested read therefore returned undefined for the whole
 * corpus, which is why the culture chapter rendered on no people fiche at all.
 *
 * Restoring the nesting is a corpus and strict-model change, not a rendering
 * one; `scripts/audit/gapAnalyzer.ts` already tracks it as a source-parser gap.
 */
export interface DetailedCultureSection {
  /** Rites of passage, initiation, funerary and divinatory practice. */
  majorRites?: string;
  /** Masks, regalia, textiles, emblems — and what they carry. */
  symbols?: string;
  /** Instruments, genres, crafts, oral literature. */
  artsAndMusic?: string;
  /** Traditional religion, and the religions living alongside it. */
  spiritualities?: string;
}

export interface HistoricalRoleSection {
  kingdomsOrChiefdoms?: string;
  relationsWithNeighbors?: string;
  conflictsOrAlliances?: string;
  diaspora?: string;
}

export interface GlobalDemographySection {
  totalPopulation?: number;
  distributionByCountry?: CountryDistribution[];
  referenceYear?: number;
  source?: string;
}

export interface CountryDistribution {
  country: CountryId;
  population?: number;
  percentage?: number;
  /**
   * Where inside the country, in the fiche's own words — regions, cities.
   *
   * 1063 of these were written across 486 fiches before the strict model
   * declared the field, so they were dropped at the transform. A share says
   * how many; this says where.
   */
  note?: string;
}

export interface LanguageReference {
  name: string;
  isoCode?: LanguageId;
  isPrimary?: boolean;
}

// ==========================================
// RELATIONS (many-to-many)
// ==========================================

export interface PeopleCountryRelation {
  peopleId: PeopleId;
  countryId: CountryId;
  population?: number;
  percentageInCountry?: number;
  percentageInAfrica?: number;
  region?: string;
}

export interface PeopleLanguageRelation {
  peopleId: PeopleId;
  languageId: LanguageId;
  isPrimary: boolean;
}

export interface LanguageFamilyPeopleRelation {
  languageFamilyId: LanguageFamilyId;
  peopleId: PeopleId;
}

// ==========================================
// DEMOGRAPHICS (critical data in columns)
// ==========================================

export interface CountryDemography {
  countryId: CountryId;
  year: number;
  population: number;
  source: string;
}

export interface PeopleDemography {
  peopleId: PeopleId;
  year: number;
  totalPopulation: number;
  source: string;
}

export interface PeopleCountryDemography {
  peopleId: PeopleId;
  countryId: CountryId;
  year: number;
  population: number;
  percentageInCountry: number;
  percentageInAfrica?: number;
  source: string;
}

// ==========================================
// NAME RECORDS (transversal table)
// ==========================================

export interface NameRecord {
  id: string;
  entityType: "country" | "people" | "language" | "languageFamily";
  entityId: string; // CountryId | PeopleId | LanguageId | LanguageFamilyId
  nameType:
    | "official"
    | "self-appellation"
    | "exonym"
    | "historical"
    | "colonial";
  name: string;
  language?: string; // Language in which the name is used
  period?: string; // Historical period
  isDerogatory?: boolean;
  isPrimary?: boolean;
  notes?: string; // Why problematic, origin, etc.
}

// ==========================================
// API TYPES
// ==========================================

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages?: number;
  /**
   * Peoples not reachable through any returnable family, surfaced instead of
   * silently omitted (REQ-108). Only populated on the language-families list.
   */
  unclassifiedPeoplesCount?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface SearchFilters {
  type?: "country" | "people" | "language" | "languageFamily";
  query?: string;
  languageFamilyId?: LanguageFamilyId;
  countryId?: CountryId;
}

export interface SearchResult {
  type: "country" | "people" | "language" | "languageFamily";
  id: string;
  name: string;
  snippet?: string;
  relevance?: number;
  data?: Country | People | Language | LanguageFamily;
}

// ETNI-38 — /v2/search FTS params (websearch_to_tsquery, confidence boost)
export interface FtsSearchParams {
  /** Optional only when a relation scope is given: a relation is a search. */
  q?: string;
  limit: number;
  offset: number;
  classificationStatus?: ClassificationStatus;
  minConfidence?: number;
  sinceVerifiedAfter?: string;
  /** Scope to the peoples of one language family (`FLG_*`). */
  familyId?: string;
  /** Scope to the peoples present in one country (ISO 3166-1 alpha-3). */
  countryId?: string;
}

/**
 * A search hit carries its own ranking evidence.
 *
 * `relevance` is comparable **within** an entity kind and not across kinds —
 * a people is scored `ts_rank × confidence`, a country by bare `ts_rank`, a
 * family by a match tier. `exactMatch` is the one signal that means the same
 * thing everywhere, which is why it sorts first.
 */
export interface RankedPeople extends People {
  languageFamilyName: string | null;
  confidence: number | null;
  relevance: number;
  exactMatch: boolean;
  /** Match excerpt; matched terms are wrapped in `[[` and `]]`. */
  snippet: string | null;
}

export interface RankedCountry extends Country {
  relevance: number;
  exactMatch: boolean;
  snippet: string | null;
}

export interface RankedLanguageFamily extends LanguageFamily {
  relevance: number;
  exactMatch: boolean;
}

/**
 * A person search hit (REQ-126). `peopleLinks` carries this person's typed
 * relation to each studied/belonged-to people — membership vs observation —
 * so an ethnographer's link to a people is never confused with membership
 * in it.
 */
export interface RankedPerson {
  id: PersonId;
  fullName: string;
  roleCategory: string;
  relevance: number;
  exactMatch: boolean;
  snippet: string | null;
  peopleLinks: PersonPeopleLink[];
}

/**
 * A name (patronyme) search hit (REQ-135). `nameMain` is the canonical
 * spelling; `content` is forwarded opaquely, same posture as the dossier
 * endpoint (`PublicPatronyme`) — DEC-039's per-subtype fields are not
 * re-typed here ahead of ETNI-1460.
 */
export interface RankedPatronyme {
  id: string;
  nameMain: string;
  nameSystem: string;
  casteOrSocialFunction: string | null;
  content: Record<string, unknown>;
  relevance: number;
  exactMatch: boolean;
  snippet: string | null;
}

/**
 * A language search hit (REQ-136). `familyName` is denormalised alongside
 * `familyId` — same posture as `RankedPeople.languageFamilyName` — so a
 * result card never has to issue a second fetch to render its family.
 */
export interface RankedLanguage {
  id: LanguageId;
  name: string;
  familyId: LanguageFamilyId;
  familyName: string | null;
  content: LanguageContent;
  relevance: number;
  exactMatch: boolean;
  snippet: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A near-miss lead (REQ-125): what the search engine almost understood,
 * shown only when the main search's `total` is 0. `kind` is scoped to the
 * three entities the search surface names to the reader (`SEARCH_LABEL`) —
 * languages, persons and patronymes are not candidates for a lead any more
 * than they are named in that label.
 */
export interface SearchLead {
  kind: "people" | "country" | "family";
  id: string;
  name: string;
  similarity: number;
}

export interface FtsSearchResponse {
  peoples: RankedPeople[];
  countries: RankedCountry[];
  families: RankedLanguageFamily[];
  persons: RankedPerson[];
  patronymes: RankedPatronyme[];
  languages: RankedLanguage[];
  /** Corpus-wide match counts, not the size of the returned page. */
  peoplesTotal: number;
  countriesTotal: number;
  familiesTotal: number;
  personsTotal: number;
  patronymesTotal: number;
  languagesTotal: number;
  total: number;
  /** Populated only when `total` is 0 (REQ-125); empty otherwise. */
  leads: SearchLead[];
}

// ==========================================
// CSV TYPES
// ==========================================

export interface LanguageFamilyCsvRow {
  id: LanguageFamilyId;
  name: string;
  population: number;
  year: number;
  source: string;
}

export interface PeopleDemographyCsvRow {
  id: PeopleId;
  name: string;
  totalPopulation: number;
  year: number;
  source: string;
}

export interface CountryDemographyCsvRow {
  id: CountryId;
  name: string;
  population: number;
  year: number;
  source: string;
}

// ==========================================
// PARSER TYPES
// ==========================================

export interface ParsedFile<T> {
  success: boolean;
  data?: T;
  errors?: ParseError[];
  warnings?: ParseWarning[];
}

export interface ParseError {
  type: "missing_id" | "invalid_format" | "missing_section" | "parse_failure";
  message: string;
  line?: number;
  section?: string;
}

export interface ParseWarning {
  type: "missing_optional_section" | "unknown_section" | "deprecated_format";
  message: string;
  section?: string;
}

/**
 * Parser options for evolutivity
 */
export interface ParserOptions {
  strictMode?: boolean; // If true, fail on unknown sections; if false, store them
  validateReferences?: boolean; // Validate that referenced IDs exist
  includeUnknownSections?: boolean; // Include unknown sections in JSONB
}

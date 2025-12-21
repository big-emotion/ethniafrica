/**
 * AFRIK Types - TypeScript type definitions for AFRIK data structure
 *
 * Core principle: STABLE identifiers + EVOLUTIONARY content
 * - Identifiers (FLG_, PPL_, ISO codes) are IMMUTABLE and serve as primary keys
 * - Content sections are stored in JSONB for flexibility and evolution
 * - New sections can be added to TXT files without schema migration
 */

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
  sources?: string[];

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
  sources?: string[];

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
  sources?: string[];

  // Allow new sections
  [key: string]: unknown;
}

// ==========================================
// SECTION TYPES (known structure)
// ==========================================

export interface HistoricalNamesSection {
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
  peoples?: PeopleDemographicEntry[];
}

export interface PeopleDemographicEntry {
  name: string;
  peopleId?: PeopleId;
  population?: number;
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
 * Detailed culture section (for people)
 * Includes all subsections from modele-peuple.txt
 */
export interface DetailedCultureSection {
  // A. Divinities and spirits
  divinitiesAndSpirits?: {
    supremeDeity?: DeityInfo;
    intermediateDivinities?: DeityInfo[];
    natureSpirits?: NatureSpiritsInfo;
    culturalFigures?: CulturalFiguresInfo;
    ancestors?: AncestorsInfo;
  };

  // B. Cosmology
  cosmology?: {
    worldStructure?: WorldStructureInfo;
    spiritualConcepts?: SpiritualConceptsInfo;
    lifeDeathRebirthCycle?: LifeCycleInfo;
    sacredTimeAndSpace?: SacredTimeSpaceInfo;
  };

  // C. Conception of person and nature
  personAndNature?: {
    bodyAndSpirit?: BodySpiritInfo;
    spiritualLifeCycle?: SpiritualLifeCycleInfo;
    conceptionOfPerson?: PersonConceptionInfo;
    sacredNature?: SacredNatureInfo;
    totemicAnimals?: TotemicAnimal[];
    sacredPlants?: SacredPlant[];
    cosmicHarmony?: CosmicHarmonyInfo;
  };

  // D. Rites and spiritual practices
  ritesAndPractices?: {
    initiationRites?: InitiationRitesInfo;
    funeraryRites?: FuneraryRitesInfo;
    agriculturalRites?: AgriculturalRitesInfo;
    purificationRites?: PurificationRitesInfo;
    divination?: DivinationInfo;
    sacrificesAndOfferings?: SacrificesInfo;
    otherMajorRites?: string[];
  };

  // E. Symbols, arts, material culture
  symbolsAndArts?: {
    symbols?: Symbol[];
    artsAndMusic?: ArtsAndMusicInfo;
    gastronomy?: GastronomyInfo;
  };

  // F. Contemporary spiritualities
  contemporarySpirituality?: {
    christianity?: ChristianityInfo;
    islam?: IslamInfo;
    traditionalReligions?: TraditionalReligionsInfo;
    religiousSyncretism?: SyncretismInfo;
    culturalResistance?: CulturalResistanceInfo;
  };
}

// Sub-types for detailed culture section
export interface DeityInfo {
  endonym?: string;
  exonym?: string;
  attributes?: string;
  veneration?: string;
  name?: string;
  role?: string;
  domain?: string;
}

export interface NatureSpiritsInfo {
  forestSpirits?: string;
  waterSpirits?: string;
  earthSpirits?: string;
  otherSpirits?: string;
}

export interface CulturalFiguresInfo {
  tricksters?: string;
  culturalHeroes?: string;
  mythologicalFigures?: string;
}

export interface AncestorsInfo {
  roleOfAncestors?: string;
  cultPractices?: string;
  sacredStatuesAndObjects?: string;
}

export interface WorldStructureInfo {
  upperWorld?: string;
  intermediateWorld?: string;
  terrestrialWorld?: string;
  underworld?: string;
}

export interface SpiritualConceptsInfo {
  soulOrVitalForce?: string;
  spiritOrPersonality?: string;
  physicalBody?: string;
  paternalSpiritualHeritage?: string;
  maternalHeritage?: string;
}

export interface LifeCycleInfo {
  conceptionOfDeath?: string;
  ancestorWorld?: string;
  reincarnation?: string;
}

export interface SacredTimeSpaceInfo {
  sacredDays?: string;
  sacredPlaces?: string;
  ritualSeasons?: string;
}

export interface BodySpiritInfo {
  physicalBody?: string;
  spiritualEssence?: string;
  spiritualDouble?: string;
}

export interface SpiritualLifeCycleInfo {
  preExistence?: string;
  birthAndIncarnation?: string;
  terrestrialLife?: string;
  deathAndPassage?: string;
  ancestrality?: string;
  reincarnation?: string;
}

export interface PersonConceptionInfo {
  personDefinition?: string;
  moralValues?: string;
  familyHonor?: string;
}

export interface SacredNatureInfo {
  forestConception?: string;
  sacredGroves?: string;
  sacredTrees?: string;
}

export interface TotemicAnimal {
  name: string;
  symbolism?: string;
}

export interface SacredPlant {
  name: string;
  ritualUse?: string;
}

export interface CosmicHarmonyInfo {
  humanNatureSpiritBalance?: string;
  respectForTaboos?: string;
  purificationRituals?: string;
}

export interface InitiationRitesInfo {
  maleInitiation?: string;
  femaleInitiation?: string;
  secretSocietyInitiation?: string;
  maskInitiation?: string;
}

export interface FuneraryRitesInfo {
  wake?: string;
  burial?: string;
  postFuneraryCeremonies?: string;
  funeraryMasks?: string;
}

export interface AgriculturalRitesInfo {
  landBlessing?: string;
  harvestFestivals?: string;
  offeringsToEarthSpirits?: string;
}

export interface PurificationRitesInfo {
  ritualBaths?: string;
  fumigation?: string;
  exorcism?: string;
}

export interface DivinationInfo {
  divinationMethods?: string;
  consultationOfDiviners?: string;
  interpretationOfSigns?: string;
}

export interface SacrificesInfo {
  animalSacrifices?: string;
  foodOfferings?: string;
  libations?: string;
}

export interface Symbol {
  name: string;
  meaning?: string;
}

export interface ArtsAndMusicInfo {
  sculpture?: string;
  masks?: string;
  weaving?: string;
  musicalInstruments?: string;
  dances?: string;
  songs?: string;
  renownedArtists?: string;
}

export interface GastronomyInfo {
  emblematicDishes?: string;
  culinaryKnowHow?: string;
  gastronomicHeritage?: string;
  ritualFoods?: string;
}

export interface ChristianityInfo {
  percentageOfPopulation?: number;
  denominations?: string;
  christianTraditionalSyncretism?: string;
}

export interface IslamInfo {
  percentageOfPopulation?: number;
  specificPractices?: string;
  islamicTraditionalSyncretism?: string;
}

export interface TraditionalReligionsInfo {
  persistenceOfPractices?: string;
  guardiansOfTraditions?: string;
}

export interface SyncretismInfo {
  coexistenceOfPractices?: string;
  contemporaryAdaptations?: string;
}

export interface CulturalResistanceInfo {
  transmissionToYoungerGenerations?: string;
  culturalRevitalization?: string;
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
  snippet?: string; // Excerpt from content
  relevance?: number;
  data?: Country | People | Language | LanguageFamily; // Full entity data
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

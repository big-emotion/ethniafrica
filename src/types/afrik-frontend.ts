/**
 * AFRIK Frontend Types
 *
 * Types optimisés pour les composants frontend.
 * Versions simplifiées (Summary) pour les listes et complètes (Detail) pour les pages de détail.
 *
 * Ces types sont dérivés de src/types/afrik.ts mais adaptés pour l'usage frontend.
 */

import type {
  CountryId,
  LanguageFamilyId,
  PeopleId,
  LanguageId,
  ClassificationStatus,
  // Content sections
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
// PAGINATION
// ==========================================

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ==========================================
// LANGUAGE FAMILY TYPES
// ==========================================

/**
 * Version légère pour les listes de familles linguistiques
 */
export interface LanguageFamilySummary {
  id: LanguageFamilyId;
  nameFr: string;
  nameEn?: string;
  // Editorial classification (migration 009) — surfaced in list cards.
  classificationStatus?: ClassificationStatus | null;
  // Données agrégées pour l'affichage en liste
  totalSpeakers?: number;
  numberOfLanguages?: number;
  geographicArea?: string;
  peopleCount?: number;
}

/**
 * Version complète pour la page de détail d'une famille linguistique
 */
export interface LanguageFamilyDetail {
  id: LanguageFamilyId;
  nameFr: string;
  nameEn?: string;
  createdAt?: string;
  updatedAt?: string;

  // Editorial classification status (migration 009)
  classificationStatus?: ClassificationStatus | null;

  // Section: En-tête décolonial
  decolonialHeader?: DecolonialHeader;

  // Section 1: Informations générales
  generalInfo?: {
    branches?: string[];
    geographicArea?: string;
    numberOfLanguages?: number;
    totalSpeakers?: number;
  };

  // Section 2: Peuples associés
  associatedPeoples?: PeopleReference[];

  // Section 3: Caractéristiques linguistiques
  linguisticCharacteristics?: {
    typology?: string;
    phonologicalFeatures?: string;
    relationsWithNeighbors?: string;
    keyInnovations?: string;
  };

  // Section 4: Histoire et origines
  historyAndOrigins?: {
    probableOrigin?: string;
    emergencePeriod?: string;
    diffusion?: string;
    historicalBreaks?: string;
    contactZones?: string;
    majorEvents?: string;
  };

  // Section 5: Distribution géographique
  distribution?: {
    totalSpeakers?: number;
    distributionByCountry?: Record<CountryId, number>;
  };

  // Section 6: Sources
  sources?: string[];
}

// ==========================================
// PEOPLE TYPES
// ==========================================

/**
 * Version légère pour les listes de peuples
 */
export interface PeopleSummary {
  id: PeopleId;
  nameMain: string;
  languageFamilyId: LanguageFamilyId;
  languageFamilyName?: string;
  currentCountries: CountryId[];
  // Editorial classification (migration 009) — surfaced in list cards.
  classificationStatus?: ClassificationStatus | null;
  // Données agrégées pour l'affichage en liste
  totalPopulation?: number;
  countryCount?: number;
  selfAppellation?: string;
}

/**
 * Version complète pour la page de détail d'un peuple
 * Inclut les 8 sections AFRIK
 */
export interface PeopleDetail {
  id: PeopleId;
  nameMain: string;
  languageFamilyId: LanguageFamilyId;
  languageFamilyName?: string;
  currentCountries: CountryId[];
  createdAt?: string;
  updatedAt?: string;

  // Editorial classification status (migration 009)
  classificationStatus?: ClassificationStatus | null;

  // Section 1: Appellations
  appellations?: AppellationsSection;

  // Section 2: Ethnies incluses
  ethnicities?: string[];

  // Section 3: Origines, migrations, formation
  origins?: OriginsSection;

  // Section 4: Organisation et structure interne
  organization?: OrganizationSection;

  // Section 5: Langues et sous-familles
  languages?: LanguagesSection;

  // Section 6: Culture, rites, traditions (A-F)
  culture?: DetailedCultureSection;

  // Section 7: Rôle historique et interactions régionales
  historicalRole?: HistoricalRoleSection;

  // Section 8: Démographie globale
  demography?: GlobalDemographySection;

  // Sources
  sources?: string[];
}

/**
 * Section culture simplifiée pour l'affichage
 */
export interface CultureDisplaySection {
  // A. Divinités et esprits
  divinities?: {
    supremeDeity?: string;
    intermediates?: string[];
    natureSpirits?: string;
    ancestors?: string;
  };

  // B. Cosmologie
  cosmology?: {
    worldStructure?: string;
    lifeDeathCycle?: string;
    sacredTimeSpace?: string;
  };

  // C. Conception de la personne et de la nature
  personAndNature?: {
    bodyAndSpirit?: string;
    totemicAnimals?: string[];
    sacredPlants?: string[];
  };

  // D. Rites et pratiques spirituelles
  rites?: {
    initiation?: string;
    funerary?: string;
    agricultural?: string;
    divination?: string;
  };

  // E. Symboles, arts, culture matérielle
  arts?: {
    symbols?: string[];
    music?: string;
    gastronomy?: string;
  };

  // F. Spiritualités contemporaines
  contemporary?: {
    christianity?: string;
    islam?: string;
    traditional?: string;
    syncretism?: string;
  };
}

// ==========================================
// COUNTRY TYPES
// ==========================================

/**
 * Version légère pour les listes de pays
 */
export interface CountrySummary {
  id: CountryId; // ISO 3166-1 alpha-3
  nameFr: string;
  nameOfficial?: string;
  // Editorial classification (migration 009) — surfaced in list cards.
  classificationStatus?: ClassificationStatus | null;
  // Données agrégées pour l'affichage en liste
  majorPeoplesCount?: number;
  population?: number;
}

/**
 * Version complète pour la page de détail d'un pays
 */
export interface CountryDetail {
  id: CountryId;
  nameFr: string;
  nameOfficial?: string;
  etymology?: string;
  nameOriginActor?: string;
  createdAt?: string;
  updatedAt?: string;

  // Section 1: Noms historiques
  historicalNames?: HistoricalNamesSection;

  // Section 2: Royaumes et civilisations
  kingdoms?: Kingdom[];

  // Section 3: Peuples majeurs
  majorPeoples?: MajorPeopleEntry[];

  // Section 5: Culture
  culture?: CultureSection;

  // Section 6: Faits historiques majeurs
  historicalFacts?: HistoricalFactsSection;

  // Section 7: Sources
  sources?: string[];

  // Démographie
  demographics?: DemographicsSection;
}

// ==========================================
// SEARCH TYPES
// ==========================================

export type SearchEntityType =
  | "country"
  | "people"
  | "language"
  | "languageFamily";

/**
 * Filtres de recherche
 */
export interface SearchFilters {
  query?: string;
  type?: SearchEntityType;
  languageFamilyId?: LanguageFamilyId;
  countryId?: CountryId;
  page?: number;
  perPage?: number;
}

/**
 * Résultat de recherche individuel
 */
export interface SearchResult {
  type: SearchEntityType;
  id: string;
  name: string;
  snippet?: string;
  relevance?: number;
  // Données supplémentaires selon le type
  languageFamilyId?: LanguageFamilyId;
  languageFamilyName?: string;
  countryIds?: CountryId[];
  population?: number;
}

/**
 * Réponse de recherche paginée
 */
export interface SearchResponse {
  data: SearchResult[];
  meta: PaginationMeta;
  filters: SearchFilters;
}

// ==========================================
// STATISTICS TYPES
// ==========================================

/**
 * Statistiques globales pour la page d'accueil
 */
export interface GlobalStats {
  totalLanguageFamilies: number;
  totalPeoples: number;
  totalCountries: number;
  totalPopulation: number;
  lastUpdated?: string;
}

/**
 * Statistiques par famille linguistique
 */
export interface LanguageFamilyStats {
  id: LanguageFamilyId;
  nameFr: string;
  totalSpeakers: number;
  numberOfPeoples: number;
  percentage: number; // Pourcentage de la population africaine
}

/**
 * Distribution d'un peuple par pays
 */
export interface PeopleDistribution {
  countryId: CountryId;
  countryName: string;
  population: number;
  percentage: number;
}

/**
 * Distribution des peuples dans un pays
 */
export interface CountryPeopleDistribution {
  peopleId: PeopleId;
  peopleName: string;
  population: number;
  percentage: number;
  languageFamilyId: LanguageFamilyId;
}

// ==========================================
// NAVIGATION & UI TYPES
// ==========================================

/**
 * Élément de l'arbre de navigation hiérarchique
 */
export interface HierarchyNode {
  id: string;
  type: "family" | "people" | "country";
  name: string;
  childCount?: number;
  children?: HierarchyNode[];
  isLoaded?: boolean;
  isExpanded?: boolean;
}

/**
 * Breadcrumb pour la navigation
 */
export interface BreadcrumbItem {
  type: "home" | "family" | "people" | "country" | "search";
  id?: string;
  label: string;
  href: string;
}

// ==========================================
// API ERROR TYPES
// ==========================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

// ==========================================
// LOADER TYPES
// ==========================================

/**
 * État de chargement pour les composants
 */
export interface LoadingState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

/**
 * Options de pagination pour les requêtes
 */
export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

/**
 * Options de filtrage pour les peuples
 */
export interface PeopleFilterOptions extends PaginationOptions {
  languageFamilyId?: LanguageFamilyId;
  countryId?: CountryId;
}

// ==========================================
// HELPER TYPES
// ==========================================

/**
 * Mapping des noms de pays (pour l'affichage)
 */
export type CountryNameMap = Record<CountryId, string>;

/**
 * Mapping des noms de familles linguistiques (pour l'affichage)
 */
export type LanguageFamilyNameMap = Record<LanguageFamilyId, string>;

/**
 * Type générique pour les réponses API single item
 */
export interface SingleItemResponse<T> {
  data: T;
}

// ==========================================
// RE-EXPORTS from afrik.ts for convenience
// ==========================================

export type {
  CountryId,
  LanguageFamilyId,
  PeopleId,
  LanguageId,
  ClassificationStatus,
  AppellationsSection,
  OriginsSection,
  OrganizationSection,
  LanguagesSection,
  DetailedCultureSection,
  HistoricalRoleSection,
  GlobalDemographySection,
  CountryDistribution,
  Kingdom,
  DecolonialHeader,
  PeopleReference,
} from "./afrik";

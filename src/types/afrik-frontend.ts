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
  ClassificationStatus,
  FicheSource,
  // Content sections
  AppellationsSection,
  OriginsSection,
  OrganizationSection,
  LanguagesSection,
  HistoricalAffiliationSection,
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
  ExternalIdentifiersSection,
} from "./afrik";
import type { PersonPeopleLink } from "./persons";

// ==========================================
// LANGUAGE FAMILY TYPES
// ==========================================

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
  sources?: FicheSource[];
}

// ==========================================
// PEOPLE TYPES
// ==========================================

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

  // Identifiants de registre externes (DEC-033) — jamais une URL stockée.
  externalIdentifiers?: ExternalIdentifiersSection;

  // Filiation historique — REQ-127. Distinct de languageFamilyId ; présent
  // seulement pour les peuples sans filiation linguistique défendable vers
  // une famille africaine (ex. créolophones). Voir DIRECTIVES-AFRIK.md §12.
  historicalAffiliation?: HistoricalAffiliationSection;

  // Section 6: Culture, rites, traditions (A-F)
  culture?: DetailedCultureSection;

  // Section 7: Rôle historique et interactions régionales
  historicalRole?: HistoricalRoleSection;

  // Section 8: Démographie globale
  demography?: GlobalDemographySection;

  // Sources
  sources?: FicheSource[];
}

// ==========================================
// COUNTRY TYPES
// ==========================================

/**
 * Version complète pour la page de détail d'un pays
 */
export interface CountryDetail {
  id: CountryId;
  nameFr: string;
  nameCommonFr: string;
  nameOfficial?: string;
  /** The chapeau — see Country.summary. Absent on fiches not yet written. */
  summary?: string;
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
  sources?: FicheSource[];

  // Démographie
  demographics?: DemographicsSection;
}

// ==========================================
// SEARCH TYPES
// ==========================================

export type SearchEntityType =
  "country" | "people" | "language" | "languageFamily" | "person" | "patronyme";

/**
 * Résultat de recherche individuel
 */
export interface SearchResult {
  type: SearchEntityType;
  id: string;
  name: string;
  /**
   * Extrait expliquant la correspondance, termes appariés encadrés par
   * `[[` et `]]` (voir `src/lib/search/highlight.ts`).
   */
  snippet?: string;
  /**
   * Score de pertinence lexicale. Comparable **au sein** d'un type d'entité,
   * pas entre types : un peuple est noté `ts_rank × confiance`, un pays
   * `ts_rank` nu, une famille par palier. Trier entre types passe donc par
   * `compareByRelevance`, qui départage d'abord sur `exactMatch`.
   */
  relevance?: number;
  /** Le nom de l'entité est exactement la requête, accents et casse ignorés. */
  exactMatch?: boolean;
  /**
   * English name of ordinary use — set on `country`, `languageFamily` and
   * `language` results when the corpus carries one (ETNI-1857). `name` stays
   * the French name every consumer already keys on; a card served in
   * English prefers this when present.
   */
  nameEn?: string;
  // Données supplémentaires selon le type
  languageFamilyId?: LanguageFamilyId;
  languageFamilyName?: string;
  /** The family's English name, when the corpus carries one (ETNI-1857). */
  languageFamilyNameEn?: string;
  countryIds?: CountryId[];
  population?: number;
  classificationStatus?: ClassificationStatus | null;
  /** Score de confiance sur [0, 1] — l'échelle de la base, pas celle du chip. */
  confidence?: number;
  /** Autonyme (selfAppellation) du peuple, quand le corpus le porte. */
  autonym?: string;
  /** Exonymes connus, dans l'ordre de la fiche. */
  exonyms?: string[];
  /**
   * Number of source entries the fiche declares. Set by the `people` branch
   * (people fiche) and, since ETNI-1804, by the `patronyme` and `language`
   * branches too (`mapSearchEnvelope`).
   */
  sourceCount?: number;
  /** Clickable source links whose fiche entries provide a title and URL. */
  externalLinks?: Array<{ title: string; url: string }>;
  /**
   * Identifiant partagé par les fiches d'un même peuple scindé en plusieurs
   * fiches concurrentes (ETNI-1391) — présent uniquement sur un résultat
   * `type: "people"` dont la fiche corpus déclare `peopleGroupId`.
   */
  peopleGroupId?: string;
  /** Libellé d'affichage du groupe, ex. "Peul / Fulani". */
  peopleGroupLabel?: string;
  /**
   * Catégorie de rôle d'une personne (REQ-126), p. ex. `ethnographer`,
   * `head_of_state`. Toujours renseigné sur un résultat `type: "person"` —
   * `mapSearchEnvelope` ne construit jamais un tel résultat sans elle,
   * parce que le rôle doit rester visible sans action du lecteur.
   */
  roleCategory?: string;
  /**
   * Le lien typé d'une personne à chaque peuple qu'elle cite — `membership`
   * (en est membre) ou `observation` (l'a étudié, ex. un·e ethnographe).
   * Jamais déduit, jamais réduit à l'appartenance : c'est la valeur que la
   * fiche déclare.
   */
  peopleLinks?: PersonPeopleLink[];
  /**
   * Naming system the fiche declares (`clan_name`, `nisba`, …) — set by the
   * `patronyme` branch of `mapSearchEnvelope` (ETNI-1804).
   */
  nameSystem?: string;
  /**
   * Caste or social function the name carries, when the fiche declares one —
   * set by the `patronyme` branch of `mapSearchEnvelope` (ETNI-1804).
   */
  casteOrSocialFunction?: string | null;
  /**
   * Ids of the peoples the fiche associates this name with — set by the
   * `patronyme` branch of `mapSearchEnvelope` (ETNI-1804).
   */
  associatedPeopleIds?: string[];
  /**
   * The associated peoples whose fiche resolved to a name, in fiche order —
   * set by the `patronyme` branch of `mapSearchEnvelope` (ETNI-1859). A
   * people id with no fiche is absent here but still counted in
   * `associatedPeopleIds`, so a panel can state the total without ever
   * printing an identifier (REQ-124, amendment of 2026-09-05).
   */
  associatedPeoples?: Array<{ id: string; name: string }>;
  /**
   * Ids of the countries the fiche marks as an `attested` (not `supposed`)
   * attestation of this name — set by the `patronyme` branch of
   * `mapSearchEnvelope` (ETNI-1804).
   */
  attestedCountryIds?: string[];
  /**
   * ISO 639-3 code — identical to `id` on a `language` result, carried under
   * its own name so a consumer never has to know that. Set by the
   * `language` branch of `mapSearchEnvelope` (ETNI-1804).
   */
  isoCode639_3?: string;
  /**
   * Ids of the peoples the fiche lists as speakers, when resolved to a
   * fiche — set by the `language` branch of `mapSearchEnvelope` (ETNI-1804).
   */
  speakerPeopleIds?: string[];
}

/**
 * Near-miss lead (REQ-125): what the search engine almost understood, shown
 * only when a search's `total` is 0. `type` reuses `SearchEntityType`'s
 * naming (`languageFamily`, not the API's `family`) so a lead can share
 * `SEARCH_ENTITY_ACCENT`'s accent and label with a real result of the same
 * kind — languages and persons are not candidates for a lead any more than
 * they are named in `SEARCH_LABEL`.
 */
export interface SearchLead {
  type: Extract<SearchEntityType, "people" | "country" | "languageFamily">;
  id: string;
  name: string;
  similarity: number;
}

// ==========================================
// API ERROR TYPES
// ==========================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
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
  HistoricalAffiliationSection,
  DetailedCultureSection,
  HistoricalRoleSection,
  GlobalDemographySection,
  CountryDistribution,
  Kingdom,
  DecolonialHeader,
  PeopleReference,
  ExternalIdentifiersSection,
} from "./afrik";

/**
 * AFRIK Data Loader - API v2
 *
 * Fonctions de fetch vers l'API v2 avec gestion d'erreur et cache client.
 * Client-side data loader for AFRIK data.
 */

import type {
  LanguageFamilySummary,
  LanguageFamilyDetail,
  PeopleSummary,
  PeopleDetail,
  CountrySummary,
  CountryDetail,
  SearchResult,
  SearchFilters,
  PaginationMeta,
  PaginatedResponse,
  GlobalStats,
  PeopleFilterOptions,
  ApiError,
} from "@/types/afrik-frontend";

import { CACHE_KEYS } from "@/lib/cache/clientCache";

// ==========================================
// CONSTANTS
// ==========================================

const API_BASE = "/api/v2";

// Default pagination
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

// ==========================================
// ERROR HANDLING
// ==========================================

/**
 * Crée une erreur API standardisée
 */
function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return { code, message, details };
}

/**
 * Gère les erreurs de fetch et retourne une erreur API
 */
async function handleFetchError(
  response: Response,
  context: string
): Promise<ApiError> {
  let message = `Failed to ${context}`;
  let details: Record<string, unknown> | undefined;

  try {
    const errorData = await response.json();
    if (errorData.error) {
      message = errorData.error.message || message;
      details = errorData.error.details;
    }
  } catch {
    // Ignore JSON parse errors
  }

  return createApiError(`HTTP_${response.status}`, message, details);
}

// ==========================================
// LANGUAGE FAMILIES
// ==========================================

/**
 * Récupère la liste des familles linguistiques (paginée)
 */
export async function getLanguageFamilies(
  page: number = DEFAULT_PAGE,
  perPage: number = DEFAULT_PER_PAGE
): Promise<PaginatedResponse<LanguageFamilySummary>> {
  try {
    const response = await fetch(
      `${API_BASE}/language-families?page=${page}&perPage=${perPage}`
    );

    if (!response.ok) {
      const error = await handleFetchError(response, "load language families");
      console.error("[getLanguageFamilies] Error:", error);
      return { data: [], meta: createEmptyMeta(page, perPage) };
    }

    const result = await response.json();

    // Transform API response to frontend types
    const data: LanguageFamilySummary[] = (result.data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (family: any) => {
        const content = family.content || {};
        const generalInfo = content.generalInfo || {};
        return {
          id: family.id,
          nameFr: family.nameFr || family.name_fr,
          nameEn: family.nameEn || family.name_en,
          totalSpeakers: generalInfo.totalSpeakers,
          numberOfLanguages: generalInfo.numberOfLanguages,
          geographicArea: generalInfo.geographicArea,
          peopleCount: content.associatedPeoples?.length,
        };
      }
    );

    return {
      data,
      meta: transformMeta(result.meta, page, perPage),
    };
  } catch (error) {
    console.error("[getLanguageFamilies] Exception:", error);
    return { data: [], meta: createEmptyMeta(page, perPage) };
  }
}

/**
 * Récupère les détails d'une famille linguistique
 */
export async function getLanguageFamily(
  id: string
): Promise<LanguageFamilyDetail | null> {
  try {
    const response = await fetch(
      `${API_BASE}/language-families/${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await handleFetchError(
        response,
        `load language family ${id}`
      );
      console.error("[getLanguageFamily] Error:", error);
      return null;
    }

    const result = await response.json();
    const apiData = result.data;

    if (!apiData) {
      return null;
    }

    // Transform API response to frontend type
    const detail: LanguageFamilyDetail = {
      id: apiData.id,
      nameFr: apiData.nameFr || apiData.name_fr,
      nameEn: apiData.nameEn || apiData.name_en,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at,
      // Content sections
      decolonialHeader: apiData.content?.decolonialHeader,
      generalInfo: apiData.content?.generalInfo,
      associatedPeoples: apiData.content?.associatedPeoples,
      linguisticCharacteristics: apiData.content?.linguisticCharacteristics,
      historyAndOrigins: apiData.content?.historyAndOrigins,
      distribution: apiData.content?.distribution,
      sources: apiData.content?.sources,
    };

    return detail;
  } catch (error) {
    console.error(`[getLanguageFamily] Exception for ${id}:`, error);
    return null;
  }
}

// ==========================================
// PEOPLES
// ==========================================

/**
 * Récupère la liste des peuples (paginée, avec filtres optionnels)
 */
export async function getPeoples(
  options: PeopleFilterOptions = {}
): Promise<PaginatedResponse<PeopleSummary>> {
  const {
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PER_PAGE,
    languageFamilyId,
    countryId,
  } = options;

  try {
    // Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      perPage: perPage.toString(),
    });

    // Note: API v2 ne supporte pas encore les filtres directement sur /peoples
    // On utilisera /search pour les filtres avancés

    const response = await fetch(`${API_BASE}/peoples?${params}`);

    if (!response.ok) {
      const error = await handleFetchError(response, "load peoples");
      console.error("[getPeoples] Error:", error);
      return { data: [], meta: createEmptyMeta(page, perPage) };
    }

    const result = await response.json();

    // Transform API response to frontend types
    const data: PeopleSummary[] = (result.data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (people: any) => {
        const content = people.content || {};
        const countries =
          people.currentCountries || people.current_countries || [];
        return {
          id: people.id,
          nameMain: people.nameMain || people.name_main,
          languageFamilyId:
            people.languageFamilyId || people.language_family_id,
          currentCountries: countries,
          totalPopulation: content.demography?.totalPopulation,
          countryCount: countries.length,
          selfAppellation: content.appellations?.selfAppellation,
        };
      }
    );

    // Apply client-side filters if needed (temporary until API supports them)
    let filteredData = data;
    if (languageFamilyId) {
      filteredData = filteredData.filter(
        (p) => p.languageFamilyId === languageFamilyId
      );
    }
    if (countryId) {
      filteredData = filteredData.filter((p) =>
        p.currentCountries.includes(countryId)
      );
    }

    return {
      data: filteredData,
      meta: transformMeta(result.meta, page, perPage),
    };
  } catch (error) {
    console.error("[getPeoples] Exception:", error);
    return { data: [], meta: createEmptyMeta(page, perPage) };
  }
}

/**
 * Récupère les détails d'un peuple (avec les 8 sections AFRIK)
 */
export async function getPeople(id: string): Promise<PeopleDetail | null> {
  try {
    const response = await fetch(
      `${API_BASE}/peoples/${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await handleFetchError(response, `load people ${id}`);
      console.error("[getPeople] Error:", error);
      return null;
    }

    const result = await response.json();
    const apiData = result.data;

    if (!apiData) {
      return null;
    }

    // Transform API response to frontend type with all 8 AFRIK sections
    const detail: PeopleDetail = {
      id: apiData.id,
      nameMain: apiData.nameMain || apiData.name_main,
      languageFamilyId: apiData.languageFamilyId || apiData.language_family_id,
      currentCountries:
        apiData.currentCountries || apiData.current_countries || [],
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at,
      // 8 AFRIK sections from content
      appellations: apiData.content?.appellations,
      ethnicities: apiData.content?.ethnicities,
      origins: apiData.content?.origins,
      organization: apiData.content?.organization,
      languages: apiData.content?.languages,
      culture: apiData.content?.culture,
      historicalRole: apiData.content?.historicalRole,
      demography: apiData.content?.demography,
      sources: apiData.content?.sources,
    };

    return detail;
  } catch (error) {
    console.error(`[getPeople] Exception for ${id}:`, error);
    return null;
  }
}

// ==========================================
// COUNTRIES
// ==========================================

/**
 * Récupère la liste des pays (paginée)
 */
export async function getCountries(
  page: number = DEFAULT_PAGE,
  perPage: number = DEFAULT_PER_PAGE
): Promise<PaginatedResponse<CountrySummary>> {
  try {
    const response = await fetch(
      `${API_BASE}/countries?page=${page}&perPage=${perPage}`
    );

    if (!response.ok) {
      const error = await handleFetchError(response, "load countries");
      console.error("[getCountries] Error:", error);
      return { data: [], meta: createEmptyMeta(page, perPage) };
    }

    const result = await response.json();

    // Transform API response to frontend types
    const data: CountrySummary[] = (result.data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (country: any) => {
        const content = country.content || {};
        return {
          id: country.id,
          nameFr: country.nameFr || country.name_fr,
          nameOfficial: country.nameOfficial || country.name_official,
          majorPeoplesCount: content.majorPeoples?.length,
          population: content.demographics?.totalPopulation,
        };
      }
    );

    return {
      data,
      meta: transformMeta(result.meta, page, perPage),
    };
  } catch (error) {
    console.error("[getCountries] Exception:", error);
    return { data: [], meta: createEmptyMeta(page, perPage) };
  }
}

/**
 * Récupère les détails d'un pays
 */
export async function getCountry(iso: string): Promise<CountryDetail | null> {
  try {
    const response = await fetch(
      `${API_BASE}/countries/${encodeURIComponent(iso)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await handleFetchError(response, `load country ${iso}`);
      console.error("[getCountry] Error:", error);
      return null;
    }

    const result = await response.json();
    const apiData = result.data;

    if (!apiData) {
      return null;
    }

    // Transform API response to frontend type
    const detail: CountryDetail = {
      id: apiData.id,
      nameFr: apiData.nameFr || apiData.name_fr,
      nameOfficial: apiData.nameOfficial || apiData.name_official,
      etymology: apiData.etymology,
      nameOriginActor: apiData.nameOriginActor || apiData.name_origin_actor,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at,
      // Content sections
      historicalNames: apiData.content?.historicalNames,
      kingdoms: apiData.content?.kingdoms,
      majorPeoples: apiData.content?.majorPeoples,
      culture: apiData.content?.culture,
      historicalFacts: apiData.content?.historicalFacts,
      sources: apiData.content?.sources,
      demographics: apiData.content?.demographics,
    };

    return detail;
  } catch (error) {
    console.error(`[getCountry] Exception for ${iso}:`, error);
    return null;
  }
}

// ==========================================
// SEARCH
// ==========================================

/**
 * Recherche multi-entités avec filtres
 */
export async function search(
  query: string,
  filters: Omit<SearchFilters, "query"> = {}
): Promise<SearchResult[]> {
  try {
    // Build query params
    const params = new URLSearchParams();

    if (query) {
      params.set("query", query);
    }
    if (filters.type) {
      params.set("type", filters.type);
    }
    if (filters.languageFamilyId) {
      params.set("languageFamilyId", filters.languageFamilyId);
    }
    if (filters.countryId) {
      params.set("countryId", filters.countryId);
    }

    const response = await fetch(`${API_BASE}/search?${params}`);

    if (!response.ok) {
      const error = await handleFetchError(response, "search");
      console.error("[search] Error:", error);
      return [];
    }

    const result = await response.json();

    // Transform API response to frontend types
    const data: SearchResult[] = (result.data || []).map(
      (item: Record<string, unknown>) => ({
        type: item.type,
        id: item.id,
        name: item.name,
        snippet: item.snippet,
        relevance: item.relevance,
        languageFamilyId: item.languageFamilyId || item.language_family_id,
        languageFamilyName: item.languageFamilyName,
        countryIds: item.countryIds || item.country_ids,
        population: item.population,
      })
    );

    return data;
  } catch (error) {
    console.error("[search] Exception:", error);
    return [];
  }
}

// ==========================================
// STATISTICS
// ==========================================

/**
 * Récupère les statistiques globales pour la page d'accueil
 * Agrège les totaux depuis les différents endpoints
 */
export async function getStats(): Promise<GlobalStats> {
  try {
    // Fetch counts from each endpoint in parallel
    const [familiesRes, peoplesRes, countriesRes] = await Promise.all([
      fetch(`${API_BASE}/language-families?page=1&perPage=1`),
      fetch(`${API_BASE}/peoples?page=1&perPage=1`),
      fetch(`${API_BASE}/countries?page=1&perPage=1`),
    ]);

    let totalLanguageFamilies = 0;
    let totalPeoples = 0;
    let totalCountries = 0;
    let totalPopulation = 0;

    // Extract totals from meta
    if (familiesRes.ok) {
      const data = await familiesRes.json();
      totalLanguageFamilies = data.meta?.total || 0;
    }

    if (peoplesRes.ok) {
      const data = await peoplesRes.json();
      totalPeoples = data.meta?.total || 0;
    }

    if (countriesRes.ok) {
      const data = await countriesRes.json();
      totalCountries = data.meta?.total || 0;
    }

    // Calculate total African population (approximately 1.4 billion for 2025)
    // This could be fetched from a dedicated stats endpoint in the future
    totalPopulation = 1_400_000_000;

    return {
      totalLanguageFamilies,
      totalPeoples,
      totalCountries,
      totalPopulation,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[getStats] Exception:", error);
    return {
      totalLanguageFamilies: 0,
      totalPeoples: 0,
      totalCountries: 0,
      totalPopulation: 0,
    };
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Crée des métadonnées de pagination vides
 */
function createEmptyMeta(page: number, perPage: number): PaginationMeta {
  return {
    total: 0,
    page,
    perPage,
    totalPages: 0,
  };
}

/**
 * Transforme les métadonnées de l'API vers le format frontend
 */
function transformMeta(
  apiMeta: Record<string, unknown> | undefined,
  page: number,
  perPage: number
): PaginationMeta {
  if (!apiMeta) {
    return createEmptyMeta(page, perPage);
  }

  const total = (apiMeta.total as number) || 0;

  return {
    total,
    page: (apiMeta.page as number) || page,
    perPage: (apiMeta.perPage as number) || perPage,
    totalPages: Math.ceil(total / perPage) || 0,
  };
}

// ==========================================
// UTILITY EXPORTS
// ==========================================

/**
 * Vide le cache v2
 */
export function clearV2Cache(): void {
  const keysToDelete = [
    CACHE_KEYS.LANGUAGE_FAMILIES,
    CACHE_KEYS.PEOPLES,
    CACHE_KEYS.COUNTRIES_V2,
    CACHE_KEYS.STATS_V2,
  ];

  if (typeof localStorage !== "undefined") {
    // Clear all keys starting with our prefixes
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && keysToDelete.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  }
}

/**
 * Récupère tous les peuples (sans pagination) - utile pour la recherche
 * Attention: peut être lent si beaucoup de données
 */
export async function getAllPeoples(): Promise<PeopleSummary[]> {
  const allPeoples: PeopleSummary[] = [];
  let page = 1;
  const perPage = 100; // Max allowed

  while (true) {
    const result = await getPeoples({ page, perPage });
    allPeoples.push(...result.data);

    if (page >= result.meta.totalPages || result.data.length === 0) {
      break;
    }
    page++;
  }

  return allPeoples;
}

/**
 * Récupère tous les pays (sans pagination) - utile pour les filtres
 */
export async function getAllCountries(): Promise<CountrySummary[]> {
  const allCountries: CountrySummary[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const result = await getCountries(page, perPage);
    allCountries.push(...result.data);

    if (page >= result.meta.totalPages || result.data.length === 0) {
      break;
    }
    page++;
  }

  return allCountries;
}

/**
 * Récupère toutes les familles linguistiques (sans pagination)
 */
export async function getAllLanguageFamilies(): Promise<
  LanguageFamilySummary[]
> {
  const allFamilies: LanguageFamilySummary[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const result = await getLanguageFamilies(page, perPage);
    allFamilies.push(...result.data);

    if (page >= result.meta.totalPages || result.data.length === 0) {
      break;
    }
    page++;
  }

  return allFamilies;
}

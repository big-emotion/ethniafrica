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
import {
  buildSearchParams,
  mapSearchEnvelope,
} from "@/lib/search/searchEnvelope";
import { logger } from "@/lib/api/logger";
import { getFrenchCountryCommonName } from "@/lib/countryNames";
import { mapCountryDetail, mapPeopleDetail } from "@/lib/afrikDetailMapper";

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

// @req REQ-108
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
      logger.error("[getLanguageFamilies] Error", error);
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
          // Row-computed by the API (REQ-108) — not fiche-declared content.
          peopleCount: family.peopleCount,
        };
      }
    );

    return {
      data,
      meta: transformMeta(result.meta, page, perPage),
    };
  } catch (error) {
    logger.error("[getLanguageFamilies] Exception", error);
    return { data: [], meta: createEmptyMeta(page, perPage) };
  }
}

// ==========================================
// PEOPLES
// ==========================================

// ==========================================
// COUNTRIES
// ==========================================

// ==========================================
// SEARCH
// ==========================================

// @req REQ-108
/**
 * Recherche multi-entités avec filtres
 */
export async function search(
  query: string,
  filters: Omit<SearchFilters, "query"> = {}
): Promise<SearchResult[]> {
  try {
    // The route matches on `q` alone and ignores entity/relation filters, so
    // the narrowing the search modal's tabs ask for happens on the results.
    const params = buildSearchParams(query);

    const response = await fetch(`${API_BASE}/search?${params}`);

    if (!response.ok) {
      const error = await handleFetchError(response, "search");
      logger.error("[search] Error", error);
      return [];
    }

    let results = mapSearchEnvelope(await response.json());

    if (filters.type) {
      results = results.filter((result) => result.type === filters.type);
    }
    if (filters.languageFamilyId) {
      results = results.filter(
        (result) => result.languageFamilyId === filters.languageFamilyId
      );
    }
    if (filters.countryId) {
      results = results.filter((result) =>
        result.countryIds?.includes(filters.countryId)
      );
    }

    return results;
  } catch (error) {
    logger.error("[search] Exception", error);
    return [];
  }
}

// ==========================================
// STATISTICS
// ==========================================

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
    unclassifiedPeoplesCount: apiMeta.unclassifiedPeoplesCount as
      | number
      | undefined,
  };
}

// ==========================================
// UTILITY EXPORTS
// ==========================================

// @req REQ-108
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

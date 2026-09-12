/**
 * AFRIK Data Loader - API v2
 *
 * Fonctions de fetch vers l'API v2 avec gestion d'erreur et cache client.
 * Client-side data loader for AFRIK data.
 */

import type {
  SearchLead,
  SearchResult,
  SearchEntityType,
  ApiError,
} from "@/types/afrik-frontend";

import {
  buildSearchParams,
  EMPTY_SEARCH_LENS_COUNTS,
  mapSearchCounts,
  mapSearchEnvelope,
  mapSearchLeads,
  type SearchLensCounts,
  type SearchQueryOptions,
} from "@/lib/search/searchEnvelope";
import { logger } from "@/lib/api/logger";

// ==========================================
// CONSTANTS
// ==========================================

const API_BASE = "/api/v2";

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
// SEARCH
// ==========================================

export interface SearchOptions extends SearchQueryOptions {
  /**
   * Narrows the mixed envelope to one kind. It stays client-side because the
   * route ranks every kind and takes no entity filter — unlike `familyId` and
   * `countryId`, which the route resolves as relation scopes and which are
   * therefore no longer re-applied here.
   */
  type?: SearchEntityType;
}

// @req REQ-108
/**
 * The one browser path to `/api/v2/search` (ETNI-1415, AC2).
 *
 * Every module that searches the corpus calls this: the quick-search modal,
 * the home hero, the /recherche page and the compare picker. They used to
 * fetch the endpoint themselves and each re-derived the query shape, which is
 * how the same input could rank differently on three surfaces.
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `${API_BASE}/search?${buildSearchParams(query, options)}`
    );

    if (!response.ok) {
      const error = await handleFetchError(response, "search");
      logger.error("[search] Error", error);
      return [];
    }

    const results = mapSearchEnvelope(await response.json());

    return options.type
      ? results.filter((result) => result.type === options.type)
      : results;
  } catch (error) {
    logger.error("[search] Exception", error);
    return [];
  }
}

export interface SearchWithLeads {
  results: SearchResult[];
  /** Near-miss leads (REQ-125) — non-empty only when the API's own total is 0. */
  leads: SearchLead[];
  /** Per-type match counts (REQ-124) for the named-lens chips. */
  counts: SearchLensCounts;
  /**
   * Whether the API answered at all.
   *
   * Every failure below degrades to the same empty envelope, which is right
   * for rendering — a reader is shown "no result" either way rather than a
   * stack trace. It is wrong for anything counting those zeroes: an outage
   * and a query the corpus cannot answer are not the same fact, and folding
   * them together files every failed request under the corpus's own gaps.
   */
  answered: boolean;
}

// @req REQ-125
/**
 * Same single browser path as `search` (ETNI-1415, AC2), additionally carrying
 * the near-miss leads a zero-result search returns. A distinct function rather
 * than an added parameter, so every existing `search()` caller keeps its
 * `SearchResult[]` return type untouched; it takes the same `SearchOptions`, so
 * a surface that needs both leads and the server-side scopes (the /recherche
 * page) reaches the corpus through here instead of fetching the endpoint itself.
 */
export async function searchWithLeads(
  query: string,
  options: SearchOptions = {}
): Promise<SearchWithLeads> {
  try {
    const response = await fetch(
      `${API_BASE}/search?${buildSearchParams(query, options)}`
    );

    if (!response.ok) {
      const error = await handleFetchError(response, "search");
      logger.error("[searchWithLeads] Error", error);
      return {
        results: [],
        leads: [],
        counts: { ...EMPTY_SEARCH_LENS_COUNTS },
        answered: false,
      };
    }

    const envelope = await response.json();
    const results = mapSearchEnvelope(envelope);
    const leads = mapSearchLeads(envelope);
    const counts = mapSearchCounts(envelope);

    return {
      results: options.type
        ? results.filter((result) => result.type === options.type)
        : results,
      leads,
      counts,
      answered: true,
    };
  } catch (error) {
    logger.error("[searchWithLeads] Exception", error);
    return {
      results: [],
      leads: [],
      counts: { ...EMPTY_SEARCH_LENS_COUNTS },
      answered: false,
    };
  }
}

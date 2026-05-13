/**
 * Response utilities for API v2
 */

import type { ApiResponse, PaginationMeta } from "@/types/afrik";

/**
 * Module #0 envelope license & attribution defaults.
 * All v2 responses surface a Creative-Commons attribution per architecture
 * decision D3 (license CC-BY-SA-4.0).
 */
export const API_LICENSE = "CC-BY-SA-4.0";
export const API_ATTRIBUTION = "Africa History — africahistory.org";

/**
 * Envelope meta block for Module #0 endpoints.
 *
 * `pagination` is optional so this meta object can either embed pagination
 * (list endpoints) or carry only license / attribution / confidence-related
 * fields (single-entity endpoints).
 */
export interface ApiResponseMeta {
  license: string;
  attribution: string;
  confidence?: number | null;
  pinned_url?: string | null;
  pagination?: PaginationMeta;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ApiResponseMeta;
  errors: ApiError[];
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

interface CreateApiResponseOptions {
  pagination?: PaginationMeta;
  confidence?: number | null;
  pinnedUrl?: string | null;
}

/**
 * Build a Module #0 envelope (`{ data, meta, errors: [] }`).
 *
 * Always carries `license` and `attribution` (AR8). Optionally embeds
 * pagination, confidence score, and pinned-version URL.
 */
export function createApiResponse<T>(
  data: T,
  options: CreateApiResponseOptions = {}
): ApiEnvelope<T> {
  const meta: ApiResponseMeta = {
    license: API_LICENSE,
    attribution: API_ATTRIBUTION,
  };

  if (options.pagination) {
    meta.pagination = options.pagination;
  }
  if (options.confidence !== undefined) {
    meta.confidence = options.confidence;
  }
  if (options.pinnedUrl !== undefined) {
    meta.pinned_url = options.pinnedUrl;
  }

  return { data, meta, errors: [] };
}

/**
 * Build a Module #0 envelope carrying one or more errors.
 *
 * `data` is `null` and `errors[]` is populated with the supplied error
 * taxonomy entries. `meta` still carries license + attribution so consumers
 * can rely on the envelope shape regardless of status code.
 */
export function createApiError(
  errors: ApiError | ApiError[]
): ApiEnvelope<null> {
  const list = Array.isArray(errors) ? errors : [errors];
  return {
    data: null,
    meta: {
      license: API_LICENSE,
      attribution: API_ATTRIBUTION,
    },
    errors: list,
  };
}

/**
 * Create a paginated API response (legacy v2 envelope, kept for backward
 * compatibility with peoples/countries/language-families endpoints).
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number = 1,
  perPage: number = 20
): ApiResponse<T[]> {
  const totalPages = Math.ceil(total / perPage);

  return {
    data,
    meta: {
      total,
      page,
      perPage,
      totalPages,
    },
  };
}

/**
 * Create a single item API response (legacy v2 envelope).
 */
export function createResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
  };
}

/**
 * Response utilities for API v2
 */

import type { PaginationMeta } from "@/types/afrik";
import { PRODUCT_NAME, CANONICAL_DOMAIN } from "@/lib/brand";

/**
 * Module #0 envelope license & attribution defaults.
 * All v2 responses surface a Creative-Commons attribution per architecture
 * decision D3 (license CC-BY-SA-4.0).
 */
// @req REQ-019
export const API_LICENSE = "CC-BY-SA-4.0";

/**
 * Composed rather than written out, because this string is the one a reuser
 * carries away in a citation. It spent a release naming a retired product and
 * a domain that serves nothing, so every fiche cited in that window points at
 * a site nobody can reach. The brand charter §1 makes `src/lib/brand.ts` the
 * only place a name is stated, and this is the furthest-travelling consumer of
 * that rule.
 */
// @req REQ-019
export const API_ATTRIBUTION = `${PRODUCT_NAME} — ${CANONICAL_DOMAIN}`;

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

/** Error codes currently emitted by API v2 routes and handlers. */
// @req REQ-084
export const API_ERROR_CODES = [
  "ILLEGAL_TRANSITION",
  "INTERNAL_ERROR",
  "INVALID_PARAM",
  "NOT_FOUND",
  "RATE_LIMITED",
  "SEMANTIC_ERROR",
  "UNAUTHENTICATED",
  "UNAUTHORIZED",
  "UNAVAILABLE",
  "VALIDATION_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiError {
  code: ApiErrorCode;
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
// @req REQ-084
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
// @req REQ-084
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

/**
 * Response utilities for API v2
 */

import type { ApiResponse, PaginationMeta } from "@/types/afrik";

/**
 * Create a paginated API response
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
 * Create a single item API response
 */
export function createResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
  };
}

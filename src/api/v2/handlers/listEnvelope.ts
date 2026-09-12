import { DEFAULT_PAGE_SIZE } from "@/api/v2/schemas/pagination";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";

/**
 * The envelope of a page-numbered corpus list: the rows, and where they sit
 * in the whole.
 *
 * The countries, peoples and language-family handlers each assembled this by
 * hand, resolving the same two defaults and dividing the same way. `extra`
 * carries what one list adds to its pagination block — the families' count of
 * unclassified peoples — without a fourth copy of the arithmetic.
 */
// @req REQ-084
export function pageNumberedListEnvelope<Row>(
  data: Row[],
  {
    total,
    page,
    perPage,
    extra,
  }: {
    total: number;
    page?: number;
    perPage?: number;
    extra?: Record<string, unknown>;
  }
): ApiEnvelope<Row[]> {
  const resolvedPage = page ?? 1;
  const resolvedPerPage = perPage ?? DEFAULT_PAGE_SIZE;

  return createApiResponse(data, {
    pagination: {
      total,
      page: resolvedPage,
      perPage: resolvedPerPage,
      totalPages: Math.ceil(total / resolvedPerPage),
      ...extra,
    },
  });
}

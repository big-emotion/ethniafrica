import { z } from "zod";

/**
 * The public API's page-size contract: twenty rows when a request names no
 * size, a hundred at most. It is what `openapiV2.ts` documents, so it is
 * stated here once rather than beside every endpoint that pages.
 *
 * A leaf module on purpose. `utils/validation.ts` imports the media schema,
 * so a schema reading these numbers from there would import itself in a
 * cycle and meet them uninitialised.
 */
// @req REQ-110
export const DEFAULT_PAGE_SIZE = 20;

// @req REQ-110
export const MAX_PAGE_SIZE = 100;

/** A `limit` / `perPage` query parameter under the shared contract. */
// @req REQ-110
export const pageSizeSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE);

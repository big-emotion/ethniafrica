import { describe, expect, it } from "vitest";

import { listMigrationsQuerySchema } from "@/api/v2/schemas/migrations";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  pageSizeSchema,
} from "@/api/v2/schemas/pagination";
import { validatePerPage } from "@/api/v2/utils/validation";

/**
 * The public API promises one page-size contract — twenty by default, a
 * hundred at most — and used to state it in nineteen places. These hold the
 * places that parse a request to the one pair of numbers.
 */
describe("API page size", () => {
  // @req REQ-110
  it("defaults to the shared page size when the request names none", () => {
    expect(pageSizeSchema.parse(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(validatePerPage(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(listMigrationsQuerySchema.parse({}).limit).toBe(DEFAULT_PAGE_SIZE);
  });

  // @req REQ-110
  it("refuses a page larger than the shared maximum", () => {
    expect(pageSizeSchema.safeParse(MAX_PAGE_SIZE).success).toBe(true);
    expect(pageSizeSchema.safeParse(MAX_PAGE_SIZE + 1).success).toBe(false);
    expect(validatePerPage(String(MAX_PAGE_SIZE + 1))).toBe(MAX_PAGE_SIZE);
  });
});

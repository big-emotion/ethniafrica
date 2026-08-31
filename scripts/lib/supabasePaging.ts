/**
 * Reading a whole table, and filtering on a whole table's worth of ids.
 *
 * Both limits below are silent until the corpus is large enough to cross them,
 * which is why they are gathered here rather than rediscovered per script:
 *
 *  - PostgREST caps a `select` at 1000 rows and says nothing. A caller that
 *    reads 3930 assertions and receives 1000 gets a smaller answer, not an
 *    error — the sweep would have quietly generated questions for a fifth of
 *    the corpus and reported success.
 *  - A `.in(...)` list travels in the URL. 1066 UUIDs is roughly 39 000
 *    characters, and the request comes back `400 Bad Request` with no hint
 *    that length was the problem.
 */

/** Matches `module-zero-batch`, which learned the same URL limit first. */
export const SUPABASE_CHUNK_SIZE = 500;

/** PostgREST's default, and the page size `fetchAllPages` steps through. */
export const SUPABASE_PAGE_SIZE = 1000;

// @req REQ-092
export function chunk<T>(
  items: T[],
  size: number = SUPABASE_CHUNK_SIZE
): T[][] {
  if (items.length <= size) return [items];
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

/**
 * Characters of `.in(...)` filter allowed per request.
 *
 * A fixed *count* is the wrong unit: 500 people ids ("PPL_YORUBA") is a
 * comfortable 7 KB, while 500 source UUIDs is 19 KB and the server rejects the
 * headers. Budgeting characters makes the limit the same one the server
 * actually enforces, and leaves room for the rest of the URL.
 */
export const SUPABASE_FILTER_BUDGET = 8000;

/** Splits ids so the resulting `.in(...)` filter fits the budget, whatever their length. */
// @req REQ-092
export function chunkForUrl<T extends string>(
  ids: T[],
  budget: number = SUPABASE_FILTER_BUDGET
): T[][] {
  if (ids.length === 0) return [];
  const longest = ids.reduce((max, id) => Math.max(max, id.length), 0);
  // Three characters for the separator and the quoting PostgREST adds.
  const size = Math.max(1, Math.floor(budget / (longest + 3)));
  return chunk(ids, size);
}

export interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

/**
 * Reads every row a query matches, one page at a time.
 *
 * `page(from, to)` must apply `.range(from, to)` and nothing else that would
 * change between calls. Stops on the first page shorter than a full one, so a
 * table whose size is an exact multiple of the page size costs one extra
 * empty read rather than silently dropping its tail.
 */
// @req REQ-092
export async function fetchAllPages<T>(
  // PromiseLike, not Promise: a Supabase query builder is thenable but is not
  // a Promise, and awaiting it is exactly how every caller uses it.
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = SUPABASE_PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
}

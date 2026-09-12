/**
 * Reads a table to its end, one `.range()` at a time.
 *
 * The walks this replaces stopped on the first page shorter than the size they
 * asked for. That is only a last page while the server honours the size: once
 * PostgREST's `max-rows` sits below it, every page is short, the first one
 * looks like the end, and the rest of the table is dropped with no error
 * anywhere. So the walk ends on an *empty* page instead, and each range starts
 * after the last row actually received rather than after the size requested —
 * otherwise the rows a cap withheld would be skipped, not re-asked for.
 *
 * The price is one extra request per walk, for the empty page that proves the
 * end. Every caller reads at most a few thousand rows once per render or
 * build, so the request is cheap next to a silently truncated corpus.
 */

export interface RangeWalkBounds {
  /** Rows asked for per request; the server may answer fewer. */
  pageSize: number;
  /**
   * Requests before giving up. A server that ignores `.range()` returns the
   * same rows forever, and this is what ends that loop.
   */
  maxPages: number;
}

export interface RangeWalk<Row> {
  rows: Row[];
  /** The page bound was reached before an empty page: the rows are incomplete. */
  truncated: boolean;
}

/**
 * `readRange` receives inclusive bounds, as `.range(from, to)` does. It throws
 * on a failed read; whether that fails the caller or degrades it is the
 * caller's decision, so the walk does not catch.
 */
// @req REQ-110
export async function walkRanges<Row>(
  readRange: (from: number, to: number) => Promise<Row[]>,
  { pageSize, maxPages }: RangeWalkBounds
): Promise<RangeWalk<Row>> {
  const rows: Row[] = [];

  for (let page = 0; page < maxPages; page++) {
    const from = rows.length;
    const batch = await readRange(from, from + pageSize - 1);
    if (batch.length === 0) return { rows, truncated: false };
    rows.push(...batch);
  }

  return { rows, truncated: true };
}

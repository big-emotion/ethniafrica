import { describe, expect, it, vi } from "vitest";

import { walkRanges } from "@/lib/supabase/queries/walkRanges";

/**
 * A server that answers at most `cap` rows per request, whatever range it is
 * asked for — which is what PostgREST's `max-rows` does, with no error and no
 * header saying so.
 */
function cappedTable(rowCount: number, cap: number) {
  const rows = Array.from({ length: rowCount }, (_, index) => index);
  return vi.fn(async (from: number, to: number) =>
    rows.slice(from, Math.min(to + 1, from + cap))
  );
}

describe("walkRanges", () => {
  // A short page used to mean "last page". Under a server cap below the page
  // size every page is short, so the walk stopped after the first one.
  // @req REQ-110
  it("reads every row when the server caps a page below the size asked for", async () => {
    const readRange = cappedTable(12, 3);

    const walk = await walkRanges(readRange, { pageSize: 5, maxPages: 40 });

    expect(walk.rows).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(walk.truncated).toBe(false);
  });

  // Advancing by the page size instead of by what came back would skip the
  // rows the cap withheld.
  // @req REQ-110
  it("asks for the next range from the last row it actually received", async () => {
    const readRange = cappedTable(7, 3);

    await walkRanges(readRange, { pageSize: 5, maxPages: 40 });

    expect(readRange.mock.calls.map(([from]) => from)).toEqual([0, 3, 6, 7]);
  });

  // @req REQ-110
  it("stops on the first empty page", async () => {
    const readRange = cappedTable(0, 500);

    const walk = await walkRanges(readRange, { pageSize: 500, maxPages: 40 });

    expect(walk.rows).toEqual([]);
    expect(readRange).toHaveBeenCalledTimes(1);
  });

  // A server that ignores `.range()` answers the same rows forever; the bound
  // is what ends that loop, and the caller is told the read is incomplete.
  // @req REQ-110
  it("reports truncation when the page bound is reached", async () => {
    const readRange = vi.fn(async () => [1, 2]);

    const walk = await walkRanges(readRange, { pageSize: 2, maxPages: 3 });

    expect(readRange).toHaveBeenCalledTimes(3);
    expect(walk.truncated).toBe(true);
  });

  // @req REQ-110
  it("lets a failed read reject the walk", async () => {
    const readRange = vi.fn(async () => {
      throw new Error("database unavailable");
    });

    await expect(
      walkRanges(readRange, { pageSize: 5, maxPages: 40 })
    ).rejects.toThrow("database unavailable");
  });
});

/**
 * Both limits these helpers exist for are silent. The quiz sweep met them on
 * the day the people corpus finally had assertions: `.in()` on 1066 source
 * ids came back `400 Bad Request`, and an unpaged read of 3930 assertions
 * would have returned exactly 1000 and reported success.
 */
import { describe, expect, it, vi } from "vitest";

import {
  chunk,
  chunkForUrl,
  fetchAllPages,
  SUPABASE_CHUNK_SIZE,
} from "../lib/supabasePaging";

describe("chunk", () => {
  // @req REQ-092
  it("leaves a list that already fits in one piece", () => {
    expect(chunk(["a", "b", "c"], 500)).toEqual([["a", "b", "c"]]);
  });

  // @req REQ-092
  it("splits a list too long for one URL", () => {
    const ids = Array.from({ length: 1066 }, (_, index) => `id-${index}`);

    const pages = chunk(ids, SUPABASE_CHUNK_SIZE);

    expect(pages).toHaveLength(3);
    expect(pages.flat()).toEqual(ids);
  });
});

describe("chunkForUrl", () => {
  const uuid = (index: number) =>
    `0d1c9f${String(index).padStart(4, "0")}-4b2a-4c3d-9e5f-a1b2c3d4e5f6`;

  // @req REQ-092
  it("keeps a filter of long ids inside the budget", () => {
    const ids = Array.from({ length: 1066 }, (_, index) => uuid(index));

    for (const page of chunkForUrl(ids)) {
      expect(page.join(",").length).toBeLessThanOrEqual(8000);
    }
  });

  // @req REQ-092
  it("fits more short ids per request than long ones", () => {
    const short = Array.from({ length: 900 }, (_, i) => `PPL_${i}`);
    const long = Array.from({ length: 900 }, (_, i) => uuid(i));

    // A fixed count is the wrong unit: 500 people ids is 7 KB of URL and 500
    // UUIDs is 19 KB, which is what made the sweep fail.
    expect(chunkForUrl(short)[0].length).toBeGreaterThan(
      chunkForUrl(long)[0].length
    );
  });

  // @req REQ-092
  it("asks for nothing when there is nothing to filter on", () => {
    expect(chunkForUrl([])).toEqual([]);
  });

  // @req REQ-092
  it("still emits one id per request when a single id fills the budget", () => {
    const huge = ["x".repeat(9000), "y".repeat(9000)];
    expect(chunkForUrl(huge)).toEqual([[huge[0]], [huge[1]]]);
  });
});

describe("fetchAllPages", () => {
  /** A table of `total` rows, served a page at a time the way PostgREST does. */
  function pagedTable(total: number, pageSize: number) {
    const rows = Array.from({ length: total }, (_, index) => ({ id: index }));
    return vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, Math.min(to + 1, from + pageSize)),
      error: null,
    }));
  }

  // @req REQ-092
  it("reads past the row cap instead of stopping at it", async () => {
    const page = pagedTable(3930, 1000);

    const rows = await fetchAllPages(page, 1000);

    // The bug this replaces returned 1000 and called it the whole table.
    expect(rows).toHaveLength(3930);
    expect(page).toHaveBeenCalledTimes(4);
  });

  // @req REQ-092
  it("stops after one read when the table fits in a page", async () => {
    const page = pagedTable(12, 1000);

    expect(await fetchAllPages(page, 1000)).toHaveLength(12);
    expect(page).toHaveBeenCalledTimes(1);
  });

  // @req REQ-092
  it("reads one empty page when the table is an exact multiple", async () => {
    const page = pagedTable(2000, 1000);

    const rows = await fetchAllPages(page, 1000);

    // Costing an empty read is the price of never dropping a tail.
    expect(rows).toHaveLength(2000);
    expect(page).toHaveBeenCalledTimes(3);
  });

  // @req REQ-092
  it("raises the error rather than returning a short table", async () => {
    const page = vi.fn(async () => ({
      data: null,
      error: { message: "Bad Request" },
    }));

    await expect(fetchAllPages(page, 1000)).rejects.toEqual({
      message: "Bad Request",
    });
  });
});

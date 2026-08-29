import { describe, expect, it } from "vitest";

import {
  PAGE_SIZE_PARAM,
  buildPageWindow,
  resolvePageSize,
} from "@/lib/hubs/pagination";

/**
 * The pager's arithmetic, kept away from the DOM.
 *
 * Every bug a pager has is an off-by-one at an edge — page one, the last page,
 * a corpus smaller than the window — and none of them need a render to be
 * caught. What the component is left to prove is that it marks the current
 * page and that it never links past the end.
 */
describe("page window", () => {
  /** The window is what the reference site shows on its first page: 1 2 3 … 8. */
  // @req REQ-108
  it("opens on a run of three, then jumps to the last page", () => {
    expect(buildPageWindow(1, 8)).toEqual([1, 2, 3, "gap", 8]);
  });

  // @req REQ-108
  it("keeps the run three long against the end rather than shrinking it", () => {
    expect(buildPageWindow(8, 8)).toEqual([1, "gap", 6, 7, 8]);
  });

  // @req REQ-108
  it("frames the current page between both edges when it sits in the middle", () => {
    expect(buildPageWindow(20, 41)).toEqual([1, "gap", 19, 20, 21, "gap", 41]);
  });

  /**
   * An ellipsis is only worth its slot when it hides more than one page. At
   * five pages it would stand in for page four alone, taking the room of the
   * number it conceals and telling the reader there is more to see than there
   * is — so five pages are listed whole, and the gap appears at six.
   */
  // @req REQ-108
  it("lists every page rather than hiding a single one behind a gap", () => {
    expect(buildPageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageWindow(3, 4)).toEqual([1, 2, 3, 4]);
  });

  // @req REQ-108
  it("starts hiding pages as soon as the gap covers two of them", () => {
    expect(buildPageWindow(1, 6)).toEqual([1, 2, 3, "gap", 6]);
  });

  // @req REQ-108
  it("lists every page when the corpus is smaller than the window", () => {
    expect(buildPageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(buildPageWindow(1, 1)).toEqual([1]);
  });

  /** Seven slots is the widest the pager ever gets, at any corpus size. */
  // @req REQ-108
  it("never grows past seven slots", () => {
    for (const pageCount of [6, 8, 41, 500]) {
      for (const page of [1, 2, Math.ceil(pageCount / 2), pageCount]) {
        expect(buildPageWindow(page, pageCount).length).toBeLessThanOrEqual(7);
      }
    }
  });

  /** A page number is typed into an address bar as readily as it is clicked. */
  // @req REQ-108
  it("never emits a page outside the corpus, whatever it is handed", () => {
    for (const window of [
      buildPageWindow(0, 5),
      buildPageWindow(99, 5),
      buildPageWindow(Number.NaN, 5),
    ]) {
      for (const slot of window) {
        if (slot !== "gap") {
          expect(slot).toBeGreaterThanOrEqual(1);
          expect(slot).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  // @req REQ-108
  it("still answers a single page for an empty selection", () => {
    expect(buildPageWindow(1, 0)).toEqual([1]);
  });
});

describe("page size", () => {
  /**
   * The default has to survive: the page number is in the URL, so an address
   * already sent must keep addressing the same twenty rows it did.
   */
  // @req REQ-108
  it("falls back to the facet's own default when the reader asked for nothing", () => {
    expect(resolvePageSize(null, [20, 50, 100])).toBe(20);
    expect(resolvePageSize(undefined, [12, 24, 48])).toBe(12);
  });

  // @req REQ-108
  it("honours a size the facet offers", () => {
    expect(resolvePageSize("50", [20, 50, 100])).toBe(50);
  });

  /**
   * An allowlist rather than a parse: `?taille=100000` is a request for the
   * whole corpus in one query, which is a page nobody asked for and a load
   * nothing bounds.
   */
  // @req REQ-108
  it("refuses a size the facet does not offer", () => {
    expect(resolvePageSize("100000", [20, 50, 100])).toBe(20);
    expect(resolvePageSize("0", [20, 50, 100])).toBe(20);
    expect(resolvePageSize("-5", [20, 50, 100])).toBe(20);
    expect(resolvePageSize("beaucoup", [20, 50, 100])).toBe(20);
  });

  // @req REQ-108
  it("names the parameter the reader sees in the address bar", () => {
    expect(PAGE_SIZE_PARAM).toBe("taille");
  });
});

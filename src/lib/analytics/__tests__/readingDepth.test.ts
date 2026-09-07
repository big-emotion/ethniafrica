import { describe, expect, it } from "vitest";

import {
  DEPTH_THRESHOLDS,
  readingDepthPercent,
  thresholdsCrossed,
} from "@/lib/analytics/readingDepth";

/**
 * How far down a fiche the reader actually got.
 *
 * Production could only approximate this with `time_on_page`, which cannot
 * separate a fiche read to the end from one left open in a background tab —
 * and the fiches are exactly where the corpus's value sits, at 251s to 276s
 * against 21s on the directories that list them.
 */

describe("readingDepthPercent", () => {
  // @req REQ-046
  it("reports the share of the document the viewport has reached", () => {
    expect(readingDepthPercent(0, 800, 3200)).toBe(25);
    expect(readingDepthPercent(800, 800, 3200)).toBe(50);
    expect(readingDepthPercent(2400, 800, 3200)).toBe(100);
  });

  /**
   * A fiche shorter than the viewport is fully read on arrival. Deriving a
   * ratio from it would divide by a height the reader never had to scroll and
   * report a partial read of a page they saw whole — the short fiches are also
   * the ones the corpus fills least, so the error would land where the data is
   * already weakest.
   */
  // @req REQ-046
  it("counts a fiche shorter than the viewport as read in full", () => {
    expect(readingDepthPercent(0, 900, 600)).toBe(100);
    expect(readingDepthPercent(0, 900, 900)).toBe(100);
  });

  // @req REQ-046
  it("never reports beyond the end of the document", () => {
    expect(readingDepthPercent(9999, 800, 3200)).toBe(100);
  });

  // @req REQ-046
  it("treats a document of no measurable height as unread rather than complete", () => {
    expect(readingDepthPercent(0, 0, 0)).toBe(0);
  });
});

describe("thresholdsCrossed", () => {
  // @req REQ-046
  it("returns every threshold newly reached, in order", () => {
    expect(thresholdsCrossed(60, [])).toEqual([25, 50]);
  });

  // @req REQ-046
  it("never repeats a threshold already recorded", () => {
    expect(thresholdsCrossed(60, [25, 50])).toEqual([]);
    expect(thresholdsCrossed(80, [25, 50])).toEqual([75]);
  });

  /**
   * A reader who scrolls straight to the bottom passed the whole fiche; the
   * shallower marks are reported with it so the funnel stays monotonic and a
   * depth histogram cannot show more readers at 100 than at 50.
   */
  // @req REQ-046
  it("reports the marks skipped by a jump to the end", () => {
    expect(thresholdsCrossed(100, [])).toEqual([...DEPTH_THRESHOLDS]);
  });

  // @req REQ-046
  it("reports nothing before the first threshold", () => {
    expect(thresholdsCrossed(24, [])).toEqual([]);
  });
});

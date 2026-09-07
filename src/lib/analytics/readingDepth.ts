/**
 * How far down a page the reader actually got.
 *
 * Until 2026-09-07 the only proxy was `time_on_page`, which cannot separate a
 * fiche read to the end from one left open in a background tab. The distinction
 * matters on this surface more than on most: fiches hold 251s to 276s while the
 * directories listing them hold 21s, and the whole question the plan asks — why
 * a reader who stays four minutes still leaves without a second page — turns on
 * whether they reached the end of the first one.
 */

/** The marks a depth histogram is read at. */
// @req REQ-046
export const DEPTH_THRESHOLDS = [25, 50, 75, 100] as const;

export type DepthThreshold = (typeof DEPTH_THRESHOLDS)[number];

/**
 * The share of the document the bottom of the viewport has reached, 0–100.
 *
 * A document no taller than the viewport counts as fully read: the reader saw
 * all of it without scrolling, and a ratio derived from a scroll that never had
 * to happen would report a partial read of a whole page. That case is not rare
 * here — the shortest fiches are the ones the corpus fills least, so the error
 * would land exactly where the numbers are already weakest.
 */
// @req REQ-046
export function readingDepthPercent(
  scrollY: number,
  viewportHeight: number,
  documentHeight: number
): number {
  if (documentHeight <= 0 || viewportHeight <= 0) return 0;
  if (documentHeight <= viewportHeight) return 100;

  const reached = ((scrollY + viewportHeight) / documentHeight) * 100;
  return Math.min(100, Math.max(0, Math.round(reached)));
}

/**
 * The thresholds newly reached, including any the reader jumped over.
 *
 * Reporting only the deepest mark would let a depth histogram show more readers
 * at 100 than at 50, which reads as a data fault rather than as a reader who
 * scrolled straight to the sources.
 */
// @req REQ-046
export function thresholdsCrossed(
  percent: number,
  alreadyRecorded: readonly number[]
): DepthThreshold[] {
  return DEPTH_THRESHOLDS.filter(
    (threshold) => percent >= threshold && !alreadyRecorded.includes(threshold)
  );
}

/**
 * Number formatting shared by the round generators (REQ-120).
 *
 * Extracted once two generators and a test had each built their own
 * `Intl.NumberFormat("fr-FR")`. French groups with a narrow no-break space
 * (U+202F), not a plain one, so a hand-written literal in an assertion will
 * not match what a reader actually sees.
 */

/** « 8 000 000 » — the grouping separator is U+202F. */
// @req REQ-120
export const frenchNumber = new Intl.NumberFormat("fr-FR");

const oneDecimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * A ratio the reader is meant to remember, not to reuse. Past ten the decimal
 * is noise — « quatorze fois » is the fact, « 14,0 fois » is a measurement —
 * and below ten it is the difference between 3,2 and 3,8.
 */
// @req REQ-120
export function ratioFr(ratio: number): string {
  return ratio >= 10
    ? frenchNumber.format(Math.round(ratio))
    : oneDecimal.format(ratio);
}

/**
 * An inflation factor keeps its decimal at every magnitude, unlike `ratioFr`.
 * The Greenland fact turns on the difference between the two: Africa is
 * fourteen times Greenland and Greenland is drawn at 14,3 times itself.
 * Rounded alike, the sentence setting them against each other reads as a
 * tautology.
 */
// @req REQ-120
export function inflationFr(factor: number): string {
  return oneDecimal.format(factor);
}

/** « 30,1 millions de km² ». */
// @req REQ-120
export function millionsKm2Fr(areaKm2: number): string {
  return `${oneDecimal.format(areaKm2 / 1_000_000)} millions de km²`;
}

/**
 * Stated to the nearest ten kilometres. The landmark coordinates are precise
 * to ten metres, but no claim made from them is: the facts compare magnitudes
 * rather than survey, and a figure printed to the kilometre would promise a
 * precision the comparison does not have.
 */
// @req REQ-120
export function distanceFr(km: number): string {
  return `${frenchNumber.format(Math.round(km / 10) * 10)} km`;
}

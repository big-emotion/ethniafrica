/**
 * English number formatting for the games — the `format.ts` helpers, one
 * locale over (REQ-145).
 *
 * Kept as a sidecar rather than as a `locale` parameter on the French helpers
 * because this PR authors content and leaves the French wording untouched;
 * the wiring PR can fold the two into one locale-parameterised set. Until
 * then the rounding rules are mirrored here line for line, and
 * `formatEn.test.ts` holds the two sets to the same figures.
 *
 * `en-GB` rather than `en-US`: the English register the brand charter asks
 * for is British, and the two locales group and punctuate numbers alike, so
 * the choice costs nothing and settles the spelling question once.
 */

/** "8,000,000" — grouped with a plain comma. */
// @req REQ-145
export const englishNumber = new Intl.NumberFormat("en-GB");

const oneDecimal = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Past ten the decimal is noise; below ten it is the whole difference. */
// @req REQ-145
export function ratioEn(ratio: number): string {
  return ratio >= 10
    ? englishNumber.format(Math.round(ratio))
    : oneDecimal.format(ratio);
}

/** An inflation factor keeps its decimal at every magnitude, as in French. */
// @req REQ-145
export function inflationEn(factor: number): string {
  return oneDecimal.format(factor);
}

/** "30.1 million km²". */
// @req REQ-145
export function millionsKm2En(areaKm2: number): string {
  return `${oneDecimal.format(areaKm2 / 1_000_000)} million km²`;
}

/** To the nearest ten kilometres, the precision the facts actually claim. */
// @req REQ-145
export function distanceEn(km: number): string {
  return `${englishNumber.format(Math.round(km / 10) * 10)} km`;
}

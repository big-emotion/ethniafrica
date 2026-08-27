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

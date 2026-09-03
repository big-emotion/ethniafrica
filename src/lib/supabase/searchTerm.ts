/**
 * Reader-supplied search terms, made safe for a PostgREST filter.
 *
 * It lived privately inside the reference library, where it guarded one
 * authenticated search. The public sources directory needs the same guard, and
 * a second copy of a rule about someone else's syntax is how the two drift.
 */

/**
 * Removes the characters PostgREST reads as filter syntax rather than as text.
 *
 * `%` is the `ilike` wildcard, so a term carrying one would widen the pattern
 * it is interpolated into; `,` separates the conditions of an `.or()`, and
 * `(` `)` delimit each condition's arguments. None of the three has an escape
 * sequence — a comma inside a term does not become a literal comma, it becomes
 * a second condition — so the only correct handling is removal. Matching
 * slightly more than the reader typed is a far smaller failure than running a
 * filter they did not write.
 */
// @req REQ-093
export function escapeSearchTerm(value: string): string {
  return value.replace(/[%,()]/g, " ").trim();
}

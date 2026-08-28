/**
 * Picks the one result a search is really about, if there is one.
 *
 * A reader who types "Bété" wants the Bété, not a ranked list in which they
 * happen to come first. But promoting a head result that merely *won* a close
 * race would state a confidence the corpus does not support, so the bar is
 * deliberately high and testable rather than tuned:
 *
 * - the head is an exact name match, accents and case folded away, or
 * - the head's relevance is at least double the runner-up's,
 *
 * and in either case no other result shares the head's normalised name. Two
 * peoples spelled the same are exactly the situation where picking one would
 * be an editorial claim; the plain list is the honest answer there.
 */

import { normalizeString } from "@/lib/normalize";
import type { SearchResult } from "@/types/afrik-frontend";

/** How far ahead of the runner-up a head must be to stand alone. */
const DOMINANCE_RATIO = 2;

// @req REQ-002
export function selectPivot(
  results: SearchResult[],
  query: string
): SearchResult | null {
  const wanted = normalizeString(query.trim());
  if (!wanted || results.length === 0) return null;

  const [head, runnerUp] = results;
  const headName = normalizeString(head.name);

  const isAmbiguous = results
    .slice(1)
    .some((result) => normalizeString(result.name) === headName);
  if (isAmbiguous) return null;

  if (headName === wanted) return head;

  // Without a runner-up there is nothing to be twice as good as, so a
  // non-matching sole result is never promoted.
  if (!runnerUp) return null;

  const headScore = head.relevance ?? 0;
  const runnerUpScore = runnerUp.relevance ?? 0;
  if (runnerUpScore > 0 && headScore >= DOMINANCE_RATIO * runnerUpScore) {
    return head;
  }

  return null;
}

import type { PersonCandidate } from "./personCandidateTypes";

/**
 * The only path from a candidate to publication. Human review is a blocking
 * gate (REQ-126): a candidate must be explicitly "approved" and carry a
 * resolved source-passage tier before it is eligible, so an unreviewed or
 * tier-unresolved candidate can never reach the database.
 */
export function selectPublishableCandidates(
  candidates: PersonCandidate[]
): PersonCandidate[] {
  return candidates.filter(
    (candidate) =>
      candidate.reviewStatus === "approved" &&
      candidate.inheritedTier !== null &&
      !candidate.reviewFlags.includes("source_tier_unresolved") &&
      !candidate.reviewFlags.includes("source_review_required")
  );
}

/**
 * FR65 verification gate: the single predicate deciding whether a
 * fiche/assertion may feed a quiz question. Used identically by the
 * generation sweep (scripts/generateQuizQuestions.ts, Story 10.5) and the
 * serve-time re-check (quizService, Story 10.6) so the credibility rule
 * lives in one place.
 */

import type { SourceTier } from "@/types/sources";

export interface QuizAssertionSource {
  tier: SourceTier;
  /**
   * `sources.verified_at is not null` — "the most recent human verification of
   * this source". Recorded, and no longer consulted here: see the note on
   * `hasEligibleSource`.
   */
  resolvable: boolean;
}

export interface QuizEligibilityInput {
  confidenceScore: number;
  /**
   * Recorded, and no longer consulted here. It still feeds the confidence
   * score's recency factor in `recompute_confidence`, so an audited fiche
   * scores higher and clears the bar more easily — it simply is not a gate of
   * its own any more.
   */
  lastHumanAuditAt: string | null;
  assertionSources: QuizAssertionSource[];
  openFlagCount: number;
}

export type QuizEligibilityRejectionReason =
  | "confidence_below_threshold"
  | "no_authoritative_source"
  | "open_flags_present";

export type QuizEligibilityResult =
  | { eligible: true; reason: null }
  | { eligible: false; reason: QuizEligibilityRejectionReason };

/**
 * 80 was unreachable rather than strict.
 *
 * `recompute_confidence` (migration 041) reserves 0.20 of the score for an
 * audit's recency factor: `0.50 × sources + 0.30 × quality + 0.20 × recency`.
 * With no audit the recency term is 0, so a fiche caps at 0.80 however well
 * sourced it is — and 80 therefore demanded a perfect source base *and* an
 * audit. Measured on the corpus: median 0.68, maximum 0.80, seven fiches at
 * the cap.
 *
 * 60 is three quarters of the reachable range — the same relative bar 80 was
 * meant to be on the full one. An audit still helps: it adds up to 0.20, so an
 * audited fiche clears this comfortably.
 */
// @req REQ-103
export const DEFAULT_QUIZ_MIN_CONFIDENCE = 60;

/**
 * `confidence_scores.score` is stored as a `[0,1]` decimal; the threshold
 * above is on a 0-100 scale. The conversion lives here, next to the bar it
 * feeds, because two callers read that same column — the generation sweep and
 * the serve-time re-check — and only one of them used to convert. The other
 * compared a raw 0.68 against 60, so every question in the bank failed the
 * gate and players got an empty session.
 *
 * A missing score yields 0, which fails the gate rather than defaulting open.
 */
// @req REQ-103
export function toQuizConfidenceScore(
  storedScore: number | null | undefined
): number {
  return storedScore != null ? Math.round(storedScore * 100) : 0;
}

/** Reads QUIZ_MIN_CONFIDENCE at call time so callers/tests can override it per-invocation. */
// @req REQ-103
export function getQuizMinConfidence(): number {
  const raw = process.env.QUIZ_MIN_CONFIDENCE;
  if (!raw) return DEFAULT_QUIZ_MIN_CONFIDENCE;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_QUIZ_MIN_CONFIDENCE;
}

/**
 * An `unverified` source may back a published fiche, but it may not back a
 * quiz answer: the quiz asserts a fact as correct, so it needs a source that
 * carries authority of its own. That bar is kept.
 *
 * What was dropped is the `resolvable` conjunct — `sources.verified_at is not
 * null`, a second, separate human verification. Nothing in the corpus performs
 * it: no loader writes `verified_at`, so every source read as unresolvable and
 * this predicate returned false for all 17 802 candidates however well sourced
 * they were. The authority signal the corpus *does* record is the tier, which
 * a curator assigned fiche by fiche — that is what this now reads.
 *
 * The standing stays visible either way: the reveal renders each source's tier
 * through `SOURCE_TIER_LABELS`, so a reader sees what an answer rests on.
 */
function hasEligibleSource(sources: QuizAssertionSource[]): boolean {
  return sources.some(
    (source) => source.tier === "official" || source.tier === "referenced"
  );
}

/**
 * Conditions are checked in a fixed precedence order (confidence → source
 * tier → open flags) so a single deterministic rejection reason feeds the
 * generation-run audit counters, even when several conditions fail on the
 * same candidate.
 *
 * The human-audit condition that used to sit second is gone. It asked for
 * `last_human_audit_at`, which no fiche carries and no loader may write —
 * forging it would attest to a review that never happened. The rule now
 * states its bar in terms of what the corpus actually records: a confidence
 * score, a source tier a curator assigned, and no open flag.
 */
// @req REQ-103
export function isQuizEligible(
  input: QuizEligibilityInput
): QuizEligibilityResult {
  if (input.confidenceScore < getQuizMinConfidence()) {
    return { eligible: false, reason: "confidence_below_threshold" };
  }
  if (!hasEligibleSource(input.assertionSources)) {
    return { eligible: false, reason: "no_authoritative_source" };
  }
  if (input.openFlagCount !== 0) {
    return { eligible: false, reason: "open_flags_present" };
  }
  return { eligible: true, reason: null };
}

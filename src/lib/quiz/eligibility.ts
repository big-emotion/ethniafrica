/**
 * FR65 verification gate: the single predicate deciding whether a
 * fiche/assertion may feed a quiz question. Used identically by the
 * generation sweep (scripts/generateQuizQuestions.ts, Story 10.5) and the
 * serve-time re-check (quizService, Story 10.6) so the credibility rule
 * lives in one place.
 */

export type QuizSourceType = "primary" | "secondary" | "ai";

export interface QuizAssertionSource {
  type: QuizSourceType;
  resolvable: boolean;
}

export interface QuizEligibilityInput {
  confidenceScore: number;
  lastHumanAuditAt: string | null;
  assertionSources: QuizAssertionSource[];
  openFlagCount: number;
}

export type QuizEligibilityRejectionReason =
  | "confidence_below_threshold"
  | "no_human_audit"
  | "no_tier1_or_tier2_source"
  | "open_flags_present";

export type QuizEligibilityResult =
  | { eligible: true; reason: null }
  | { eligible: false; reason: QuizEligibilityRejectionReason };

// @req REQ-103
export const DEFAULT_QUIZ_MIN_CONFIDENCE = 80;

/** Reads QUIZ_MIN_CONFIDENCE at call time so callers/tests can override it per-invocation. */
// @req REQ-103
export function getQuizMinConfidence(): number {
  const raw = process.env.QUIZ_MIN_CONFIDENCE;
  if (!raw) return DEFAULT_QUIZ_MIN_CONFIDENCE;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_QUIZ_MIN_CONFIDENCE;
}

function hasEligibleSource(sources: QuizAssertionSource[]): boolean {
  return sources.some(
    (source) =>
      source.resolvable &&
      (source.type === "primary" || source.type === "secondary")
  );
}

/**
 * Conditions are checked in a fixed precedence order (confidence → human
 * audit → source tier → open flags) so a single deterministic rejection
 * reason feeds the generation-run audit counters, even when several
 * conditions fail on the same candidate.
 */
// @req REQ-103
export function isQuizEligible(
  input: QuizEligibilityInput
): QuizEligibilityResult {
  if (input.confidenceScore < getQuizMinConfidence()) {
    return { eligible: false, reason: "confidence_below_threshold" };
  }
  if (!input.lastHumanAuditAt) {
    return { eligible: false, reason: "no_human_audit" };
  }
  if (!hasEligibleSource(input.assertionSources)) {
    return { eligible: false, reason: "no_tier1_or_tier2_source" };
  }
  if (input.openFlagCount !== 0) {
    return { eligible: false, reason: "open_flags_present" };
  }
  return { eligible: true, reason: null };
}

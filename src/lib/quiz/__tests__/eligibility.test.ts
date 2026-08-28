import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isQuizEligible,
  getQuizMinConfidence,
  DEFAULT_QUIZ_MIN_CONFIDENCE,
  type QuizEligibilityInput,
} from "@/lib/quiz/eligibility";

describe("isQuizEligible", () => {
  const originalThreshold = process.env.QUIZ_MIN_CONFIDENCE;

  beforeEach(() => {
    delete process.env.QUIZ_MIN_CONFIDENCE;
  });

  afterEach(() => {
    if (originalThreshold !== undefined) {
      process.env.QUIZ_MIN_CONFIDENCE = originalThreshold;
    } else {
      delete process.env.QUIZ_MIN_CONFIDENCE;
    }
  });

  const eligibleInput: QuizEligibilityInput = {
    confidenceScore: 90,
    lastHumanAuditAt: "2026-01-01T00:00:00.000Z",
    assertionSources: [{ tier: "official", resolvable: true }],
    openFlagCount: 0,
  };

  describe("all conditions pass", () => {
    // @req REQ-103
    it("returns eligible: true with reason: null", () => {
      expect(isQuizEligible(eligibleInput)).toEqual({
        eligible: true,
        reason: null,
      });
    });

    // @req REQ-103
    it("accepts a Tier 2 (secondary) resolvable source", () => {
      expect(
        isQuizEligible({
          ...eligibleInput,
          assertionSources: [{ tier: "referenced", resolvable: true }],
        })
      ).toEqual({ eligible: true, reason: null });
    });

    // @req REQ-103
    it("is eligible when at least one source qualifies among several", () => {
      expect(
        isQuizEligible({
          ...eligibleInput,
          assertionSources: [
            { tier: "unverified", resolvable: true },
            { tier: "official", resolvable: false },
            { tier: "referenced", resolvable: true },
          ],
        })
      ).toEqual({ eligible: true, reason: null });
    });
  });

  describe("confidence score condition", () => {
    // @req REQ-103
    it("rejects a score below the default threshold (60)", () => {
      expect(isQuizEligible({ ...eligibleInput, confidenceScore: 59 })).toEqual(
        {
          eligible: false,
          reason: "confidence_below_threshold",
        }
      );
    });

    // @req REQ-103
    it("is eligible exactly at the threshold boundary (score === threshold)", () => {
      expect(isQuizEligible({ ...eligibleInput, confidenceScore: 60 })).toEqual(
        { eligible: true, reason: null }
      );
    });

    /**
     * 80 was unreachable, not strict. `recompute_confidence` reserves 0.20 of
     * the score for an audit's recency factor, so an unaudited fiche caps at
     * 0.80 — demanding 80 demanded a perfect source base *and* an audit. 60 is
     * three quarters of the reachable range, the same relative bar 80 was
     * meant to be.
     */
    // @req REQ-103
    it("sets a bar an unaudited fiche can actually clear", () => {
      expect(DEFAULT_QUIZ_MIN_CONFIDENCE).toBeLessThan(80);
      expect(
        isQuizEligible({
          ...eligibleInput,
          confidenceScore: 68, // the corpus median once its provenance was written
          lastHumanAuditAt: null,
        })
      ).toEqual({ eligible: true, reason: null });
    });

    // @req REQ-103
    it("respects a custom QUIZ_MIN_CONFIDENCE env threshold", () => {
      process.env.QUIZ_MIN_CONFIDENCE = "95";
      expect(isQuizEligible({ ...eligibleInput, confidenceScore: 90 })).toEqual(
        {
          eligible: false,
          reason: "confidence_below_threshold",
        }
      );
      expect(isQuizEligible({ ...eligibleInput, confidenceScore: 95 })).toEqual(
        { eligible: true, reason: null }
      );
    });

    // @req REQ-103
    it("falls back to the default threshold when the env var is not a finite number", () => {
      process.env.QUIZ_MIN_CONFIDENCE = "not-a-number";
      expect(getQuizMinConfidence()).toBe(DEFAULT_QUIZ_MIN_CONFIDENCE);
    });
  });

  describe("human verification is recorded, not required", () => {
    /**
     * Both of these gated on a human act nothing in the corpus performs: no
     * source carries `verified_at` and no fiche carries `last_human_audit_at`,
     * so the pair rejected all 17 802 candidates. The authority test is now
     * the source's tier, which a curator did assign, fiche by fiche.
     */
    // @req REQ-103
    it("accepts a fiche no human has audited", () => {
      expect(
        isQuizEligible({ ...eligibleInput, lastHumanAuditAt: null })
      ).toEqual({ eligible: true, reason: null });
    });

    // @req REQ-103
    it("accepts an official source no human has separately verified", () => {
      expect(
        isQuizEligible({
          ...eligibleInput,
          lastHumanAuditAt: null,
          assertionSources: [{ tier: "official", resolvable: false }],
        })
      ).toEqual({ eligible: true, reason: null });
    });
  });

  describe("source tier condition", () => {
    // @req REQ-103
    it("rejects an empty sources array", () => {
      expect(
        isQuizEligible({ ...eligibleInput, assertionSources: [] })
      ).toEqual({ eligible: false, reason: "no_authoritative_source" });
    });

    // @req REQ-103
    it("still rejects a fiche whose only sources are unverified", () => {
      // The tier bar is what the rule kept: an `unverified` source may back a
      // published fiche, but not an answer the quiz asserts as correct.
      expect(
        isQuizEligible({
          ...eligibleInput,
          assertionSources: [
            { tier: "unverified", resolvable: true },
            { tier: "unverified", resolvable: false },
          ],
        })
      ).toEqual({ eligible: false, reason: "no_authoritative_source" });
    });

    // @req REQ-103
    it("rejects a resolvable Tier 3 ('ai') source", () => {
      expect(
        isQuizEligible({
          ...eligibleInput,
          assertionSources: [{ tier: "unverified", resolvable: true }],
        })
      ).toEqual({ eligible: false, reason: "no_authoritative_source" });
    });
  });

  describe("open flag condition", () => {
    // @req REQ-103
    it("rejects when openFlagCount is greater than zero", () => {
      expect(isQuizEligible({ ...eligibleInput, openFlagCount: 1 })).toEqual({
        eligible: false,
        reason: "open_flags_present",
      });
    });

    // @req REQ-103
    it("accepts openFlagCount === 0", () => {
      expect(isQuizEligible({ ...eligibleInput, openFlagCount: 0 })).toEqual({
        eligible: true,
        reason: null,
      });
    });
  });

  describe("deterministic rejection-reason precedence", () => {
    // @req REQ-103
    it("prioritizes confidence_below_threshold over all other failing conditions", () => {
      expect(
        isQuizEligible({
          confidenceScore: 10,
          lastHumanAuditAt: null,
          assertionSources: [],
          openFlagCount: 3,
        })
      ).toEqual({ eligible: false, reason: "confidence_below_threshold" });
    });

    // @req REQ-103
    it("no longer stops at a missing audit before reaching the real failures", () => {
      expect(
        isQuizEligible({
          confidenceScore: 90,
          lastHumanAuditAt: null,
          assertionSources: [],
          openFlagCount: 3,
        })
      ).toEqual({ eligible: false, reason: "no_authoritative_source" });
    });

    // @req REQ-103
    it("prioritizes no_authoritative_source over an open-flag failure", () => {
      expect(
        isQuizEligible({
          confidenceScore: 90,
          lastHumanAuditAt: "2026-01-01T00:00:00.000Z",
          assertionSources: [],
          openFlagCount: 3,
        })
      ).toEqual({ eligible: false, reason: "no_authoritative_source" });
    });
  });
});

describe("getQuizMinConfidence", () => {
  const originalThreshold = process.env.QUIZ_MIN_CONFIDENCE;

  beforeEach(() => {
    delete process.env.QUIZ_MIN_CONFIDENCE;
  });

  afterEach(() => {
    if (originalThreshold !== undefined) {
      process.env.QUIZ_MIN_CONFIDENCE = originalThreshold;
    } else {
      delete process.env.QUIZ_MIN_CONFIDENCE;
    }
  });

  // @req REQ-103
  it("defaults to 60 when unset", () => {
    expect(getQuizMinConfidence()).toBe(60);
    expect(DEFAULT_QUIZ_MIN_CONFIDENCE).toBe(60);
  });

  // @req REQ-103
  it("parses a valid numeric env override", () => {
    process.env.QUIZ_MIN_CONFIDENCE = "70";
    expect(getQuizMinConfidence()).toBe(70);
  });
});

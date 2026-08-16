import { afterEach, describe, expect, it } from "vitest";

import { isQuizFeatureEnabled } from "@/lib/featureFlags";

describe("isQuizFeatureEnabled (Epic 10, Story 10.8, ETNI-497, AR39)", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_FEATURE_QUIZ;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    } else {
      process.env.NEXT_PUBLIC_FEATURE_QUIZ = ORIGINAL;
    }
  });

  // @req REQ-103 FR66
  it("is disabled when the env var is unset", () => {
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    expect(isQuizFeatureEnabled()).toBe(false);
  });

  // @req REQ-103 FR66
  it("is disabled for any value other than the literal string 'true'", () => {
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "1";
    expect(isQuizFeatureEnabled()).toBe(false);
  });

  // @req REQ-103 FR66
  it("is enabled when set to 'true'", () => {
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "true";
    expect(isQuizFeatureEnabled()).toBe(true);
  });
});

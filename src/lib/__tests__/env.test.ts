import { describe, expect, it } from "vitest";

import { positiveIntFromEnv } from "@/lib/env";

/**
 * The contract that matters here is the failure mode, not the happy path: a
 * typo in an env var must not be able to take a running deployment down, and
 * must not silently become a limit of zero — which on a rate limiter would
 * refuse every request, and on a timeout would abort every query.
 */
describe("positiveIntFromEnv", () => {
  // @req REQ-110
  it("reads a configured value", () => {
    expect(positiveIntFromEnv("42", 10)).toBe(42);
  });

  // @req REQ-110
  it("falls back when the variable is unset or empty", () => {
    expect(positiveIntFromEnv(undefined, 10)).toBe(10);
    expect(positiveIntFromEnv("", 10)).toBe(10);
  });

  // @req REQ-110
  it("falls back rather than throwing on a value that is not a number", () => {
    expect(positiveIntFromEnv("soon", 10)).toBe(10);
  });

  // @req REQ-110
  it("refuses zero and negatives, which would disable the thing they configure", () => {
    expect(positiveIntFromEnv("0", 10)).toBe(10);
    expect(positiveIntFromEnv("-5", 10)).toBe(10);
  });
});

import { describe, it, expect } from "vitest";
import { quizSessionQuerySchema, DEFAULT_QUIZ_SESSION_COUNT } from "../quiz";

describe("quizSessionQuerySchema", () => {
  // @req REQ-103
  it("accepts a valid segment, difficulty and count", () => {
    const result = quizSessionQuerySchema.safeParse({
      segment: "adults",
      difficulty: "3",
      count: "6",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        segment: "adults",
        difficulty: 3,
        count: 6,
      });
    }
  });

  // @req REQ-103
  it("defaults count to 8 when omitted", () => {
    const result = quizSessionQuerySchema.safeParse({
      segment: "adults",
      difficulty: "3",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(DEFAULT_QUIZ_SESSION_COUNT);
    }
  });

  // @req REQ-103
  it("rejects an unknown segment", () => {
    const result = quizSessionQuerySchema.safeParse({
      segment: "babies",
      difficulty: "1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["segment"]);
    }
  });

  // @req REQ-103
  it("rejects count above the maximum", () => {
    const result = quizSessionQuerySchema.safeParse({
      segment: "adults",
      difficulty: "3",
      count: "50",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["count"]);
    }
  });

  // @req REQ-103
  it("rejects count below the minimum", () => {
    const result = quizSessionQuerySchema.safeParse({
      segment: "adults",
      difficulty: "3",
      count: "1",
    });

    expect(result.success).toBe(false);
  });

  // @req REQ-103
  it("rejects a difficulty outside the global 1-5 range", () => {
    const result = quizSessionQuerySchema.safeParse({
      segment: "adults",
      difficulty: "7",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["difficulty"]);
    }
  });

  // @req REQ-103
  it("rejects a non-numeric difficulty", () => {
    const result = quizSessionQuerySchema.safeParse({
      segment: "adults",
      difficulty: "abc",
    });

    expect(result.success).toBe(false);
  });

  // @req REQ-103
  it("rejects a missing segment", () => {
    const result = quizSessionQuerySchema.safeParse({
      difficulty: "3",
    });

    expect(result.success).toBe(false);
  });
});

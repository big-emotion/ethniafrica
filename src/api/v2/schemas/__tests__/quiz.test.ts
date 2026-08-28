import { describe, it, expect } from "vitest";
import { quizSessionQuerySchema, DEFAULT_QUIZ_SESSION_COUNT } from "../quiz";

describe("quizSessionQuerySchema", () => {
  // @req REQ-103
  it("accepts a country track and a count", () => {
    const result = quizSessionQuerySchema.safeParse({
      pays: "GHA",
      count: "6",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        pays: "GHA",
        famille: undefined,
        mode: undefined,
        count: 6,
      });
    }
  });

  // @req REQ-103
  it("defaults count to 8 when omitted", () => {
    const result = quizSessionQuerySchema.safeParse({ pays: "GHA" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(DEFAULT_QUIZ_SESSION_COUNT);
    }
  });

  // @req REQ-103
  it("accepts no track at all — the whole-corpus session", () => {
    const result = quizSessionQuerySchema.safeParse({});

    expect(result.success).toBe(true);
  });

  // @req REQ-103
  it("reads a blank parameter as no filter, not as an empty id", () => {
    // A GET form on « Tous les pays » submits `?pays=`.
    const result = quizSessionQuerySchema.safeParse({ pays: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pays).toBeUndefined();
    }
  });

  // @req REQ-103
  it("rejects a country code that is not alpha-3", () => {
    const result = quizSessionQuerySchema.safeParse({ pays: "GHANA" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["pays"]);
    }
  });

  // @req REQ-103
  it("rejects a family id outside the FLG_ namespace", () => {
    const result = quizSessionQuerySchema.safeParse({ famille: "bantu" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["famille"]);
    }
  });

  // @req REQ-103
  it("rejects an unknown mode", () => {
    const result = quizSessionQuerySchema.safeParse({ mode: "difficile" });

    expect(result.success).toBe(false);
  });

  // @req REQ-103
  it("rejects count above the maximum", () => {
    const result = quizSessionQuerySchema.safeParse({
      pays: "GHA",
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
      pays: "GHA",
      count: "1",
    });

    expect(result.success).toBe(false);
  });
});

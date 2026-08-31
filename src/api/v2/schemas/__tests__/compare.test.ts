import { describe, it, expect } from "vitest";
import { compareQuerySchema } from "../compare";

describe("compareQuerySchema", () => {
  // @req REQ-084
  it("accepts a valid type + 2 distinct ids", () => {
    const result = compareQuerySchema.safeParse({
      type: "peoples",
      ids: "PPL_SHONA,PPL_ZULU",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        type: "peoples",
        ids: ["PPL_SHONA", "PPL_ZULU"],
      });
    }
  });

  // @req REQ-084
  it("accepts a valid type + 3 distinct ids", () => {
    const result = compareQuerySchema.safeParse({
      type: "countries",
      ids: "ZWE,MOZ,ZAF",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ids).toEqual(["ZWE", "MOZ", "ZAF"]);
    }
  });

  // @req REQ-084
  it("trims whitespace around comma-separated ids", () => {
    const result = compareQuerySchema.safeParse({
      type: "language-families",
      ids: " FLG_BANTU , FLG_NILOTIC ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ids).toEqual(["FLG_BANTU", "FLG_NILOTIC"]);
    }
  });

  // ── type ────────────────────────────────────────────────────────────────
  // @req REQ-084
  it("rejects a type outside the allowed set, naming the field", () => {
    const result = compareQuerySchema.safeParse({
      type: "bogus",
      ids: "PPL_SHONA,PPL_ZULU",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["type"]);
    }
  });

  // @req REQ-084
  it("rejects a missing type", () => {
    const result = compareQuerySchema.safeParse({
      ids: "PPL_SHONA,PPL_ZULU",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["type"]);
    }
  });

  // ── ids: count ─────────────────────────────────────────────────────────
  // @req REQ-084
  it("rejects a single id, naming the field", () => {
    const result = compareQuerySchema.safeParse({
      type: "peoples",
      ids: "PPL_SHONA",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ids"]);
    }
  });

  // @req REQ-084
  it("rejects zero ids (empty string)", () => {
    const result = compareQuerySchema.safeParse({
      type: "peoples",
      ids: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ids"]);
    }
  });

  // @req REQ-084
  it("rejects more than 3 ids, naming the field", () => {
    const result = compareQuerySchema.safeParse({
      type: "peoples",
      ids: "PPL_A,PPL_B,PPL_C,PPL_D",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ids"]);
    }
  });

  // ── ids: duplicates ────────────────────────────────────────────────────
  // @req REQ-084
  it("rejects duplicate ids, naming the field", () => {
    const result = compareQuerySchema.safeParse({
      type: "peoples",
      ids: "PPL_SHONA,PPL_SHONA",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ids"]);
    }
  });

  // @req REQ-084
  it("rejects a missing ids param", () => {
    const result = compareQuerySchema.safeParse({
      type: "peoples",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ids"]);
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  confidenceEntityTypeSchema,
  confidenceEntityIdSchema,
  confidenceParamsSchema,
} from "@/api/v2/schemas/confidence";

describe("fabric entity_type union — 'relation' support (ETNI-503, Story 11.2)", () => {
  // @req REQ-091
  it("accepts 'relation' as a confidence entity type", () => {
    expect(confidenceEntityTypeSchema.safeParse("relation").success).toBe(true);
  });

  // @req REQ-091
  it("still accepts the pre-existing entity types (additive change only)", () => {
    expect(confidenceEntityTypeSchema.safeParse("people").success).toBe(true);
    expect(
      confidenceEntityTypeSchema.safeParse("language-family").success
    ).toBe(true);
  });

  // @req REQ-091
  it("accepts a REL_* entity id", () => {
    expect(
      confidenceEntityIdSchema.safeParse("REL_SONINKE_MANDE_TRADE").success
    ).toBe(true);
  });

  // @req REQ-091
  it("accepts a relation entityType paired with a REL_* entityId", () => {
    const result = confidenceParamsSchema.safeParse({
      entityType: "relation",
      entityId: "REL_SONINKE_MANDE_TRADE",
    });
    expect(result.success).toBe(true);
  });

  // @req REQ-091
  it("rejects a relation entityType paired with a mismatched prefix", () => {
    const result = confidenceParamsSchema.safeParse({
      entityType: "relation",
      entityId: "PPL_SONINKE",
    });
    expect(result.success).toBe(false);
  });
});

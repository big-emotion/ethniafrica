import { describe, it, expect } from "vitest";
import {
  confidenceEntityTypeSchema,
  confidenceEntityIdSchema,
  confidenceParamsSchema,
} from "@/api/v2/schemas/confidence";

describe("fabric entity_type union — 'migration' support (ETNI-516, Story 12.3)", () => {
  // @req REQ-080
  it("accepts 'migration' as a confidence entity type", () => {
    expect(confidenceEntityTypeSchema.safeParse("migration").success).toBe(
      true
    );
  });

  // @req REQ-080
  it("still accepts the pre-existing entity types (additive change only)", () => {
    expect(confidenceEntityTypeSchema.safeParse("people").success).toBe(true);
    expect(
      confidenceEntityTypeSchema.safeParse("language-family").success
    ).toBe(true);
    expect(confidenceEntityTypeSchema.safeParse("relation").success).toBe(true);
  });

  // @req REQ-080
  it("accepts a MGR_* entity id", () => {
    expect(
      confidenceEntityIdSchema.safeParse("MGR_BANTU_HOMELAND_DISPERSAL").success
    ).toBe(true);
  });

  // @req REQ-080
  it("accepts a migration entityType paired with a MGR_* entityId", () => {
    const result = confidenceParamsSchema.safeParse({
      entityType: "migration",
      entityId: "MGR_BANTU_HOMELAND_DISPERSAL",
    });
    expect(result.success).toBe(true);
  });

  // @req REQ-080
  it("rejects a migration entityType paired with a mismatched prefix", () => {
    const result = confidenceParamsSchema.safeParse({
      entityType: "migration",
      entityId: "PPL_SONINKE",
    });
    expect(result.success).toBe(false);
  });
});

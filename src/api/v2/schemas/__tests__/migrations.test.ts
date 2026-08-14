import { describe, it, expect } from "vitest";
import {
  migrationDetailParamSchema,
  listMigrationsQuerySchema,
} from "../migrations";

describe("migrationDetailParamSchema", () => {
  // @req REQ-098
  it("accepts a well-formed MGR_ id", () => {
    expect(
      migrationDetailParamSchema.safeParse({
        id: "MGR_BANTU_HOMELAND_DISPERSAL",
      }).success
    ).toBe(true);
  });

  // @req REQ-098
  it("rejects a PPL_ id", () => {
    expect(
      migrationDetailParamSchema.safeParse({ id: "PPL_KONGO" }).success
    ).toBe(false);
  });
});

describe("listMigrationsQuerySchema", () => {
  // @req REQ-098
  it("defaults limit to 20 and offset to 0", () => {
    const result = listMigrationsQuerySchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  // @req REQ-098
  it("coerces from/to year strings to numbers, including negatives (BCE)", () => {
    const result = listMigrationsQuerySchema.parse({
      from: "-2000",
      to: "500",
    });
    expect(result.from).toBe(-2000);
    expect(result.to).toBe(500);
  });

  // @req REQ-098
  it("accepts a well-formed filter set", () => {
    const result = listMigrationsQuerySchema.safeParse({
      from: "-3000",
      to: "0",
      eventType: "expansion",
      peopleId: "PPL_KONGO",
      classificationStatus: "contested",
      group: "bantu-expansion",
      limit: "10",
      offset: "5",
    });
    expect(result.success).toBe(true);
  });

  // @req REQ-098
  it("rejects an unknown eventType", () => {
    const result = listMigrationsQuerySchema.safeParse({
      eventType: "invasion",
    });
    expect(result.success).toBe(false);
  });

  // @req REQ-098
  it("rejects a malformed peopleId", () => {
    const result = listMigrationsQuerySchema.safeParse({ peopleId: "kongo" });
    expect(result.success).toBe(false);
  });

  // @req REQ-098
  it("rejects an unknown classificationStatus", () => {
    const result = listMigrationsQuerySchema.safeParse({
      classificationStatus: "settled",
    });
    expect(result.success).toBe(false);
  });

  // @req REQ-098
  it("rejects from > to", () => {
    const result = listMigrationsQuerySchema.safeParse({
      from: "500",
      to: "-2000",
    });
    expect(result.success).toBe(false);
  });

  // @req REQ-098
  it("rejects a limit above 100", () => {
    const result = listMigrationsQuerySchema.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });

  // @req REQ-098
  it("rejects an offset below 0", () => {
    const result = listMigrationsQuerySchema.safeParse({ offset: "-1" });
    expect(result.success).toBe(false);
  });
});

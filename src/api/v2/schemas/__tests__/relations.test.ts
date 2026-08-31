import { describe, it, expect } from "vitest";
import {
  egoNetworkParamSchema,
  egoNetworkQuerySchema,
  relationDetailParamSchema,
  listRelationsQuerySchema,
} from "../relations";

describe("egoNetworkParamSchema", () => {
  // @req REQ-097
  it("accepts a well-formed PPL_ id", () => {
    expect(egoNetworkParamSchema.safeParse({ id: "PPL_EWE" }).success).toBe(
      true
    );
  });

  // @req REQ-097
  it("rejects a malformed id", () => {
    expect(egoNetworkParamSchema.safeParse({ id: "ewe" }).success).toBe(false);
  });
});

describe("egoNetworkQuerySchema", () => {
  // @req REQ-097
  it("defaults includeDerived to true and limit to 24 when omitted", () => {
    const result = egoNetworkQuerySchema.parse({});
    expect(result.includeDerived).toBe(true);
    expect(result.limit).toBe(24);
    expect(result.types).toBeUndefined();
  });

  // @req REQ-097
  it("parses a CSV types param into an array of relation types", () => {
    const result = egoNetworkQuerySchema.parse({
      types: "migratory,commercial",
    });
    expect(result.types).toEqual(["migratory", "commercial"]);
  });

  // @req REQ-097
  it("rejects an unknown relation type in the CSV list", () => {
    const result = egoNetworkQuerySchema.safeParse({ types: "linguistic" });
    expect(result.success).toBe(false);
  });

  // @req REQ-097
  it("coerces includeDerived=false from the query string", () => {
    const result = egoNetworkQuerySchema.parse({ includeDerived: "false" });
    expect(result.includeDerived).toBe(false);
  });

  // @req REQ-097
  it("rejects a limit above 100", () => {
    const result = egoNetworkQuerySchema.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });
});

describe("relationDetailParamSchema", () => {
  // @req REQ-097
  it("accepts a well-formed REL_ id", () => {
    expect(
      relationDetailParamSchema.safeParse({ id: "REL_SONINKE_MANDE_TRADE" })
        .success
    ).toBe(true);
  });

  // @req REQ-097
  it("rejects a PPL_ id", () => {
    expect(
      relationDetailParamSchema.safeParse({ id: "PPL_SONINKE" }).success
    ).toBe(false);
  });
});

describe("listRelationsQuerySchema", () => {
  // @req REQ-097
  it("defaults limit to 20 and offset to 0", () => {
    const result = listRelationsQuerySchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  // @req REQ-097
  it("accepts a well-formed filter set", () => {
    const result = listRelationsQuerySchema.safeParse({
      types: "commercial",
      peopleId: "PPL_EWE",
      periodFrom: "1400",
      periodTo: "1900",
      limit: "10",
      offset: "5",
    });
    expect(result.success).toBe(true);
  });

  // @req REQ-097
  it("rejects a malformed peopleId", () => {
    const result = listRelationsQuerySchema.safeParse({ peopleId: "ewe" });
    expect(result.success).toBe(false);
  });

  // @req REQ-097
  it("rejects periodFrom > periodTo", () => {
    const result = listRelationsQuerySchema.safeParse({
      periodFrom: "1900",
      periodTo: "1400",
    });
    expect(result.success).toBe(false);
  });

  // @req REQ-097
  it("rejects an offset below 0", () => {
    const result = listRelationsQuerySchema.safeParse({ offset: "-1" });
    expect(result.success).toBe(false);
  });
});

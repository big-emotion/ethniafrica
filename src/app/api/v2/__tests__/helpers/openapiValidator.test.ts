import { describe, expect, it } from "vitest";
import {
  generateExample,
  validateAgainstSchema,
} from "@/app/api/v2/__tests__/helpers/openapiValidator";

describe("openapiValidator", () => {
  // @req REQ-033
  it("accepts a payload conforming to a $ref schema", () => {
    const errors = validateAgainstSchema(
      { $ref: "#/components/schemas/CountryDetailEnvelope" },
      {
        data: { id: "ZWE", patronymes: { attested: [], borneByPeoples: [] } },
        meta: { license: "CC-BY-SA-4.0", attribution: "EthniAfrica" },
        errors: [],
      }
    );

    expect(errors).toBeNull();
  });

  // @req REQ-033
  it("rejects a payload missing a required field", () => {
    const errors = validateAgainstSchema(
      { $ref: "#/components/schemas/CountryDetailEnvelope" },
      { data: { id: "ZWE" }, errors: [] }
    );

    expect(errors).not.toBeNull();
    expect(errors?.some((e) => e.message?.includes("meta"))).toBe(true);
  });

  // @req REQ-033
  it("rejects a payload with the wrong enum value", () => {
    const errors = validateAgainstSchema(
      { $ref: "#/components/schemas/ApiErrorEntry" },
      { code: "NOT_A_REAL_CODE", message: "oops" }
    );

    expect(errors).not.toBeNull();
  });

  // @req REQ-033
  it("generates an example that resolves $ref, allOf and maxItems:0 into a valid instance", () => {
    const example = generateExample({
      $ref: "#/components/schemas/CountriesListEnvelope",
    }) as { data: unknown; meta: { pagination?: unknown }; errors: unknown[] };

    expect(Array.isArray(example.data)).toBe(true);
    expect(example.meta.pagination).toBeDefined();
    expect(example.errors).toEqual([]);

    const errors = validateAgainstSchema(
      { $ref: "#/components/schemas/CountriesListEnvelope" },
      example
    );
    expect(errors).toBeNull();
  });

  // @req REQ-033
  it("guards against a self-referential $ref cycle", () => {
    expect(() =>
      generateExample({ $ref: "#/components/schemas/ApiErrorEnvelope" })
    ).not.toThrow();
  });
});

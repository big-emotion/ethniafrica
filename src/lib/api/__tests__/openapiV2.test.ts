import { describe, expect, it } from "vitest";

import { swaggerSpecV2 } from "@/lib/api/openapiV2";

describe("OpenAPI v2 contract", () => {
  // @req REQ-036
  it("documents optional people list filters and the standard envelope", () => {
    expect(swaggerSpecV2).toMatchObject({
      paths: {
        "/api/v2/peoples": {
          get: {
            parameters: expect.arrayContaining([
              expect.objectContaining({
                in: "query",
                name: "search",
                required: false,
              }),
              expect.objectContaining({
                in: "query",
                name: "letter",
                required: false,
              }),
              expect.objectContaining({
                in: "query",
                name: "languageFamilyId",
                required: false,
              }),
            ]),
            responses: {
              200: {
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/PeoplesListEnvelope",
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  // @req REQ-093
  it("documents normalized source keys and permits offline citations", () => {
    const source = swaggerSpecV2.components?.schemas?.Source as {
      properties?: Record<string, unknown>;
    };

    expect(source.properties).toMatchObject({
      sourceKey: { type: ["string", "null"] },
      sourceKind: { type: ["string", "null"] },
      tier: {
        type: ["string", "null"],
        enum: ["official", "referenced", "unverified", null],
      },
      identifiers: { type: ["object", "null"] },
      url: { type: ["string", "null"] },
    });
  });
});

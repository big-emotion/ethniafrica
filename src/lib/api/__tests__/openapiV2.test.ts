import { describe, expect, it } from "vitest";

import { swaggerSpecV2 } from "@/lib/api/openapiV2";

describe("OpenAPI v2 contract", () => {
  // @req REQ-036
  it("documents optional people list filters and the legacy pagination envelope", () => {
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
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/PeopleV2",
                          },
                        },
                        meta: {
                          $ref: "#/components/schemas/PaginationMeta",
                        },
                      },
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
});

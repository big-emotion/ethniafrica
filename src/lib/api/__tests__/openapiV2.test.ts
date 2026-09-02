import { describe, expect, it } from "vitest";

import { swaggerSpecV2 } from "@/lib/api/openapiV2";
import { QUIZ_TEMPLATE_IDS } from "@/lib/quiz/segmentPolicy";

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

  /**
   * The templateId enum is hand-written here and derived nowhere, so it had
   * gone stale twice over: it still advertised T5 after that template was
   * retired, and had never gained T13-T18. Nothing failed either time, because
   * no test compared it to the policy that owns the list.
   */
  // @req REQ-097
  it("advertises exactly the templates the policy declares", () => {
    const question = (
      swaggerSpecV2 as {
        components: {
          schemas: {
            QuizSessionQuestion: {
              properties: { templateId: { enum: string[] } };
            };
          };
        };
      }
    ).components.schemas.QuizSessionQuestion;

    expect([...question.properties.templateId.enum].sort()).toEqual(
      [...QUIZ_TEMPLATE_IDS].sort()
    );
  });
});

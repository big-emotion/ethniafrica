import { describe, expect, it } from "vitest";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";

interface ErrorExample {
  errors: Array<{ code: string; message: string }>;
}

interface MediaType {
  schema?: { $ref?: string };
  example?: ErrorExample;
  examples?: Record<string, { value: ErrorExample }>;
}

interface PostOperation {
  requestBody: {
    content: Record<string, MediaType>;
  };
  responses: Record<
    string,
    {
      content: Record<string, MediaType>;
    }
  >;
}

interface OpenApiSpec {
  components: {
    schemas: Record<
      string,
      {
        required?: string[];
        properties?: Record<string, unknown>;
      }
    >;
  };
  paths: Record<string, { post: PostOperation }>;
}

const spec = swaggerSpecV2 as unknown as OpenApiSpec;
const flagCreate = spec.components.schemas.FlagCreateInput;
const flagPost = spec.paths["/api/v2/flags"].post;

describe("OpenAPI v2 Turnstile contract", () => {
  // @req REQ-012
  it("requires turnstile_token in the POST flags request schema", () => {
    expect(flagPost.requestBody.content["application/json"].schema?.$ref).toBe(
      "#/components/schemas/FlagCreateInput"
    );
    expect(flagCreate.required).toContain("turnstile_token");
    expect(flagCreate.properties).toHaveProperty("turnstile_token");
  });

  // @req REQ-012
  it("documents the exact French anti-bot rejection message", () => {
    const unauthorized =
      flagPost.responses["403"].content["application/json"].examples
        ?.unauthorized.value;

    expect(unauthorized?.errors).toEqual([
      {
        code: "UNAUTHORIZED",
        message: "vérification anti-bot échouée",
      },
    ]);
  });

  // @req REQ-012
  it("documents the exact French retry message when verification is unavailable", () => {
    const unavailable =
      flagPost.responses["503"].content["application/json"].example;

    expect(unavailable?.errors).toEqual([
      {
        code: "UNAVAILABLE",
        message:
          "vérification anti-bot temporairement indisponible, veuillez réessayer plus tard",
      },
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { swaggerSpecV2 } from "@/lib/api/openapiV2";

interface SchemaObject {
  type?: string | string[];
  pattern?: string;
  enum?: Array<string | null>;
  minimum?: number;
  required?: string[];
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
  maxItems?: number;
}

interface OperationObject {
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    example?: string;
    schema: SchemaObject;
  }>;
  responses: Record<
    string,
    {
      content?: Record<string, { schema: SchemaObject }>;
    }
  >;
}

interface OpenApiSpec {
  tags?: Array<{ name: string }>;
  components: { schemas: Record<string, SchemaObject> };
  paths: Record<string, Record<string, OperationObject>>;
}

const spec = swaggerSpecV2 as unknown as OpenApiSpec;
const schemas = spec.components.schemas;

describe("OpenAPI v2 language detail contract", () => {
  // @req REQ-136
  it("documents the generated language detail operation", () => {
    expect(spec.tags).toContainEqual(
      expect.objectContaining({ name: "API v2 - Languages" })
    );

    const operation = spec.paths["/api/v2/languages/{id}"]?.get;

    expect(operation).toBeDefined();
    expect(operation.tags).toEqual(["API v2 - Languages"]);
    expect(operation.parameters).toContainEqual({
      in: "path",
      name: "id",
      required: true,
      schema: { type: "string", pattern: "^[a-z]{3}$" },
      description: "Lowercase ISO 639-3 language identifier",
      example: "yor",
    });
    expect(Object.keys(operation.responses).sort()).toEqual([
      "200",
      "400",
      "404",
      "500",
    ]);
    expect(
      operation.responses["200"].content?.["application/json"].schema
    ).toEqual({ $ref: "#/components/schemas/LanguageDetailEnvelope" });
    for (const status of ["400", "404", "500"]) {
      expect(
        operation.responses[status].content?.["application/json"].schema
      ).toEqual({ $ref: "#/components/schemas/ApiErrorEnvelope" });
    }
  });

  // @req REQ-136
  it("matches the public language source schema", () => {
    expect(schemas.LanguageSourceV2).toEqual({
      type: "object",
      properties: {
        id: { type: "string", minLength: 1 },
        title: { type: "string", minLength: 1 },
        url: { type: ["string", "null"] },
        tier: {
          type: "string",
          enum: ["official", "referenced", "unverified"],
        },
        notes: { type: ["string", "null"] },
      },
      required: ["id", "title", "url", "tier"],
    });
  });

  // @req REQ-136
  it("matches every required and nullable public language field", () => {
    const language = schemas.LanguageV2;

    expect(language.required).toEqual([
      "id",
      "name",
      "nameProvenance",
      "family",
      "speakingPeoples",
      "vehicularRole",
      "vitalityStatus",
      "sources",
    ]);
    expect(language.properties).toEqual({
      id: { type: "string", pattern: "^[a-z]{3}$" },
      name: { type: "string", minLength: 1 },
      nameProvenance: {
        type: "string",
        enum: ["sourced", "derived"],
      },
      family: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
        },
        required: ["id", "name"],
      },
      speakingPeoples: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1 },
          },
          required: ["id", "name"],
        },
      },
      vehicularRole: { type: ["string", "null"] },
      vitalityStatus: {
        type: ["object", "null"],
        properties: {
          status: { type: "string", minLength: 1 },
          scale: { type: "string", minLength: 1 },
          asOf: { type: "integer", minimum: 1 },
        },
        required: ["status", "scale", "asOf"],
      },
      sources: {
        type: "array",
        items: { $ref: "#/components/schemas/LanguageSourceV2" },
      },
    });
  });

  // @req REQ-136
  it("defines the successful zero-error envelope", () => {
    expect(schemas.LanguageDetailEnvelope).toEqual({
      type: "object",
      properties: {
        data: { $ref: "#/components/schemas/LanguageV2" },
        meta: { $ref: "#/components/schemas/ApiResponseMeta" },
        errors: {
          type: "array",
          items: { $ref: "#/components/schemas/ApiErrorEntry" },
          maxItems: 0,
        },
      },
      required: ["data", "meta", "errors"],
    });
  });
});

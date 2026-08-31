import { describe, expect, it } from "vitest";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";

interface SchemaObject {
  type?: string | string[];
  format?: string;
  enum?: string[];
  required?: string[];
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
  description?: string;
  writeOnly?: boolean;
}

interface OperationObject {
  security?: Array<Record<string, unknown>>;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema: SchemaObject;
  }>;
  requestBody?: {
    required?: boolean;
    content: Record<string, { schema: SchemaObject }>;
  };
  responses: Record<
    string,
    {
      headers?: Record<string, { schema: SchemaObject }>;
      content?: Record<string, { schema: SchemaObject }>;
    }
  >;
}

interface OpenApiSpec {
  components: { schemas: Record<string, SchemaObject> };
  paths: Record<string, Record<string, OperationObject>>;
}

const spec = swaggerSpecV2 as unknown as OpenApiSpec;
const schemas = spec.components.schemas;

function expectAuthenticatedNoStore(operation: OperationObject) {
  expect(operation.tags).toEqual(["API v2 - Reference Library"]);
  expect(operation.security).toEqual([{ SupabaseJwtAuth: [] }]);

  for (const response of Object.values(operation.responses)) {
    expect(response.headers?.["Cache-Control"]?.schema).toMatchObject({
      type: "string",
      example: "no-store",
    });
  }
}

describe("OpenAPI v2 reference library contract", () => {
  // @req REQ-012
  it("documents the authenticated, no-store search and creation endpoints", () => {
    const collection = spec.paths["/api/v2/reference-library"];

    expect(collection).toBeDefined();
    expect(Object.keys(collection)).toEqual(["get", "post"]);
    expectAuthenticatedNoStore(collection.get);
    expectAuthenticatedNoStore(collection.post);
    expect(Object.keys(collection.get.responses).sort()).toEqual([
      "200",
      "400",
      "401",
      "500",
    ]);
    expect(Object.keys(collection.post.responses).sort()).toEqual([
      "200",
      "201",
      "400",
      "401",
      "500",
    ]);

    expect(collection.get.parameters).toEqual([
      expect.objectContaining({
        in: "query",
        name: "q",
        required: true,
        schema: expect.objectContaining({ maxLength: 200, type: "string" }),
      }),
      expect.objectContaining({
        in: "query",
        name: "limit",
        schema: expect.objectContaining({
          default: 20,
          maximum: 100,
          minimum: 1,
          type: "integer",
        }),
      }),
    ]);
    expect(
      collection.post.requestBody?.content["application/json"].schema
    ).toEqual({ $ref: "#/components/schemas/ReferenceCreateInput" });
  });

  // @req REQ-012
  it("documents structured reference and assertion creation input", () => {
    expect(schemas.ReferenceCreateInput.required).toEqual([
      "source_key",
      "title",
      "authors",
      "publication_year",
      "source_kind",
      "tier",
    ]);
    expect(schemas.ReferenceCreateInput.properties).toMatchObject({
      source_key: { type: "string", maxLength: 160 },
      authors: { type: "array", minItems: 1, maxItems: 20 },
      publication_year: { type: "integer", minimum: 1000, maximum: 9999 },
      tier: {
        type: "string",
        enum: ["official", "referenced", "unverified"],
      },
    });
    expect(schemas.AssertionReferenceCreateInput.required).toEqual([
      "assertion_id",
      "source_id",
      "locator_type",
      "locator_value",
    ]);
    expect(schemas.AssertionReferenceCreateInput.properties).toMatchObject({
      assertion_id: { type: "string", format: "uuid" },
      source_id: { type: "string", format: "uuid" },
      locator_type: {
        type: "string",
        enum: ["page", "folio", "section", "timestamp"],
      },
    });

    const assertions = spec.paths["/api/v2/reference-library/assertions"];
    expect(Object.keys(assertions)).toEqual(["post"]);
    expectAuthenticatedNoStore(assertions.post);
    expect(Object.keys(assertions.post.responses).sort()).toEqual([
      "201",
      "400",
      "401",
      "500",
    ]);
    expect(
      assertions.post.requestBody?.content["application/json"].schema
    ).toEqual({ $ref: "#/components/schemas/AssertionReferenceCreateInput" });
  });

  // @req REQ-012
  it("documents private multipart assets without binary or storage location fields", () => {
    const assets = spec.paths["/api/v2/reference-library/assets"];

    expect(Object.keys(assets)).toEqual(["post"]);
    expectAuthenticatedNoStore(assets.post);
    expect(Object.keys(assets.post.responses).sort()).toEqual([
      "201",
      "400",
      "401",
      "500",
    ]);
    expect(
      assets.post.requestBody?.content["multipart/form-data"].schema
    ).toEqual({
      $ref: "#/components/schemas/ReferenceWorkingAssetCreateInput",
    });
    expect(schemas.ReferenceWorkingAssetCreateInput.required).toEqual([
      "sourceId",
      "assetKind",
      "file",
    ]);
    expect(schemas.ReferenceWorkingAssetCreateInput.properties).toMatchObject({
      sourceId: { type: "string", format: "uuid" },
      assetKind: { type: "string", enum: ["scan", "ocr"] },
      file: {
        type: "string",
        format: "binary",
        writeOnly: true,
      },
    });

    const privateAsset = schemas.PrivateReferenceWorkingAsset;
    expect(privateAsset.description).toContain("private");
    expect(privateAsset.required).toEqual([
      "id",
      "sourceId",
      "assetKind",
      "filename",
      "contentType",
      "byteSize",
      "rightsStatus",
      "createdAt",
    ]);
    expect(privateAsset.properties).toMatchObject({
      rightsStatus: { type: "string", enum: ["private"] },
      createdAt: { type: "string", format: "date-time" },
    });
    expect(Object.keys(privateAsset.properties ?? {})).not.toEqual(
      expect.arrayContaining([
        "content",
        "object_path",
        "objectPath",
        "path",
        "bucket_id",
        "bucketId",
      ])
    );
  });
});

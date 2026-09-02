import { describe, expect, it } from "vitest";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";
import { API_ERROR_CODES } from "@/api/v2/utils/response";

interface SchemaObject {
  $ref?: string;
  type?: string | string[];
  format?: string;
  scheme?: string;
  bearerFormat?: string;
  minimum?: number;
  maximum?: number;
  default?: number;
  enum?: string[];
  required?: string[];
  properties?: Record<string, SchemaObject>;
  example?: Record<string, unknown>;
}

interface EnvelopeExample {
  data: null | { public_slug?: string };
  meta: {
    pagination?: {
      limit: number;
      next_cursor: string;
    };
  };
  errors: Array<{ code: string }>;
}

interface MediaTypeObject {
  schema: SchemaObject;
  example: EnvelopeExample;
  examples: Record<string, { value: EnvelopeExample }>;
}

interface ResponseObject {
  headers: Record<string, unknown>;
  content: Record<string, MediaTypeObject>;
}

interface ParameterObject {
  name: string;
  in: string;
  description: string;
  schema: SchemaObject;
}

interface OperationObject {
  security: Array<Record<string, unknown>>;
  parameters: ParameterObject[];
  responses: Record<string, ResponseObject>;
  requestBody: {
    content: Record<
      string,
      {
        example: Record<string, unknown>;
      }
    >;
  };
}

interface PathObject {
  get: OperationObject;
  post: OperationObject;
}

interface OpenApiSpec {
  components: {
    schemas: Record<string, SchemaObject>;
    securitySchemes: Record<string, SchemaObject>;
  };
  paths: Record<string, PathObject>;
}

// swagger-jsdoc returns an untyped object even though this test validates a known contract.
const spec = swaggerSpecV2 as unknown as OpenApiSpec;
const schemas = spec.components.schemas;
const flagCollection = spec.paths["/api/v2/flags"];
const flagDetail = spec.paths["/api/v2/flags/{public_slug_or_id}"];

const FLAG_KINDS = [
  "inaccurate",
  "missing-source",
  "broken-url",
  "offensive",
  "correction-proposal",
  "other",
  // The one kind that proposes rather than reports, and therefore the one the
  // anchor is not required from (migration 081).
  "contribution",
];

const FLAG_STATUSES = [
  "open",
  "under_review",
  "accepted",
  "rejected",
  "withdrawn",
  "duplicate",
];

describe("OpenAPI v2 flags contract", () => {
  // @req REQ-084
  it("documents collection and detail methods with their exact response sets", () => {
    expect(flagCollection).toBeDefined();
    expect(flagCollection.get).toBeDefined();
    expect(flagCollection.post).toBeDefined();
    expect(flagDetail).toBeDefined();
    expect(flagDetail.get).toBeDefined();

    // No 401: submitting a report no longer requires a session, so there is
    // no unauthenticated case left to document (moderation charter §2).
    expect(Object.keys(flagCollection.post.responses).sort()).toEqual([
      "201",
      "400",
      "403",
      "429",
      "500",
      "503",
    ]);
    expect(Object.keys(flagCollection.get.responses).sort()).toEqual([
      "200",
      "400",
      "500",
    ]);
    expect(Object.keys(flagDetail.get.responses).sort()).toEqual([
      "200",
      "400",
      "404",
      "500",
    ]);
  });

  // @req REQ-084
  it("defines canonical flag enums and the complete creation input", () => {
    expect(schemas.FlagKind.enum).toEqual(FLAG_KINDS);
    expect(schemas.FlagStatus.enum).toEqual(FLAG_STATUSES);

    expect(schemas.FlagCreateInput.required).toEqual([
      "target_type",
      "target_id",
      "flag_kind",
      "reason_text",
      "antibot",
    ]);
    expect(Object.keys(schemas.FlagCreateInput.properties).sort()).toEqual(
      [
        "counter_source_citation",
        "counter_source_url",
        "flag_kind",
        "proposed_rewrite",
        "reason_text",
        // Optional, and the only personal datum a report can carry. It is
        // documented because a client has to know it exists; the response
        // schemas never echo it back.
        "reporter_email",
        "target_field_path",
        "target_id",
        "target_type",
        "antibot",
        "elapsedMs",
      ].sort()
    );
    expect(schemas.FlagCreateInput.example).toMatchObject({
      target_type: "people",
      target_id: "PPL_YORUBA",
      flag_kind: "inaccurate",
      antibot: expect.objectContaining({ salt: expect.any(String) }),
    });
  });

  // @req REQ-084
  it("defines created and full public flag rows with concrete examples", () => {
    expect(schemas.FlagCreated.required).toEqual([
      "id",
      "public_slug",
      "status",
      "created_at",
    ]);
    expect(schemas.FlagCreated.properties.id.format).toBe("uuid");
    expect(schemas.FlagCreated.example).toMatchObject({
      id: expect.any(String),
      public_slug: expect.any(String),
      status: "open",
      created_at: expect.any(String),
    });

    expect(schemas.PublicFlag.required).toEqual([
      "id",
      "public_slug",
      "target_type",
      "target_id",
      "target_field_path",
      "assertion_id",
      "flag_kind",
      "reason_text",
      "counter_source_url",
      "counter_source_citation",
      "proposed_rewrite",
      "contributor_id",
      "severity",
      "auto_generated",
      "status",
      "created_at",
      "updated_at",
      "resolved_at",
    ]);
    expect(schemas.PublicFlag.example).toMatchObject({
      flag_kind: "inaccurate",
      status: "open",
      auto_generated: false,
    });
  });

  // @req REQ-084
  it("documents opaque cursor pagination and every list filter", () => {
    expect(schemas.FlagCursorPaginationMeta.properties.limit).toMatchObject({
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 20,
    });
    expect(
      schemas.FlagCursorPaginationMeta.properties.next_cursor
    ).toMatchObject({
      type: ["string", "null"],
    });

    const parameters = Object.fromEntries(
      flagCollection.get.parameters.map((parameter) => [
        parameter.name,
        parameter,
      ])
    );
    expect(Object.keys(parameters).sort()).toEqual(
      ["status", "kind", "target_type", "cursor", "limit"].sort()
    );
    expect(parameters.status.schema.enum).toEqual(FLAG_STATUSES);
    expect(parameters.kind.schema.enum).toEqual(FLAG_KINDS);
    expect(parameters.cursor.schema.type).toBe("string");
    expect(parameters.limit.schema).toMatchObject({
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 20,
    });
  });

  // @req REQ-084
  it("uses Supabase JWT only for create while reads remain public", () => {
    expect(spec.components.securitySchemes.SupabaseJwtAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
    // Two schemes: a bearer token, or none at all. The token decides who the
    // report is credited to, never whether it is accepted.
    expect(flagCollection.post.security).toEqual([{ SupabaseJwtAuth: [] }, {}]);
    expect(flagCollection.get.security).toEqual([]);
    expect(flagDetail.get.security).toEqual([]);
  });

  // @req REQ-084
  it("links success envelopes and includes concrete request/response examples", () => {
    expect(
      flagCollection.post.requestBody.content["application/json"].example
    ).toEqual(schemas.FlagCreateInput.example);
    expect(
      flagCollection.post.responses["201"].content["application/json"].schema
        .$ref
    ).toBe("#/components/schemas/FlagCreatedResponse");
    expect(
      flagCollection.get.responses["200"].content["application/json"].schema
        .$ref
    ).toBe("#/components/schemas/FlagListResponse");
    expect(
      flagDetail.get.responses["200"].content["application/json"].schema.$ref
    ).toBe("#/components/schemas/FlagDetailResponse");
    expect(
      flagCollection.post.responses["201"].content["application/json"].example
        .data.public_slug
    ).toBeTruthy();
    expect(
      flagCollection.get.responses["200"].content["application/json"].example
        .meta.pagination
    ).toEqual({
      limit: 20,
      next_cursor: expect.any(String),
    });
    expect(
      flagDetail.get.parameters.find(
        (parameter) =>
          parameter.name === "public_slug_or_id" && parameter.in === "path"
      ).description
    ).toMatch(/UUID.*public slug/i);
  });

  // @req REQ-084
  it("documents complete error codes and rate-limit headers", () => {
    expect(schemas.ApiErrorEntry.properties.code.enum).toEqual(API_ERROR_CODES);

    expect(
      Object.keys(flagCollection.post.responses["429"].headers).sort()
    ).toEqual(
      [
        "Retry-After",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
      ].sort()
    );
    // AGE_CONFIRMATION_REQUIRED documented a 403 the handler never returned:
    // an unconfirmed account has its report recorded anonymously rather than
    // refused (moderation charter §2), and there are no accounts left to
    // confirm an age on.
    expect(
      Object.keys(
        flagCollection.post.responses["403"].content["application/json"]
          .examples
      )
    ).toEqual(["unauthorized"]);
    expect(
      flagCollection.post.responses["403"].content["application/json"].examples
        .unauthorized.value.errors[0].code
    ).toBe("UNAUTHORIZED");
    expect(
      flagCollection.post.responses["503"].content["application/json"].example
        .errors[0].code
    ).toBe("UNAVAILABLE");
    expect(
      flagDetail.get.responses["404"].content["application/json"].example
        .errors[0].code
    ).toBe("NOT_FOUND");
  });
});

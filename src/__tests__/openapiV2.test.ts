// @req REQ-036
// @req REQ-075
// @req REQ-084
import { describe, it, expect } from "vitest";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";

describe("OpenAPI v2 spec - BearerAuth security", () => {
  it("declares OpenAPI 3.1 without legacy nullable keywords", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;

    expect(spec.openapi).toBe("3.1.0");
    expect(JSON.stringify(spec)).not.toContain('"nullable":true');
  });

  it("documents only the implemented flags operations", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;
    const paths = spec.paths as Record<string, Record<string, unknown>>;

    expect(paths["/api/v2/flags"]?.post).toBeDefined();
    expect(paths["/api/v2/flags"]?.get).toBeDefined();
    expect(paths["/api/v2/flags/{public_slug_or_id}"]?.get).toBeDefined();
  });

  it("documents every implemented Module #0 route", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;
    const paths = spec.paths as Record<string, Record<string, unknown>>;

    expect(
      paths["/api/v2/confidence/{entityType}/{entityId}"]?.get
    ).toBeDefined();
    expect(paths["/api/v2/doctrine"]?.get).toBeDefined();
    expect(paths["/api/v2/sources"]?.get).toBeDefined();
    expect(paths["/api/v2/sources/{id}"]?.get).toBeDefined();
  });

  it("should define BearerAuth in securitySchemes", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;
    const components = spec.components as Record<string, unknown>;
    const schemes = components?.securitySchemes as Record<string, unknown>;
    expect(schemes).toBeDefined();
    expect(schemes.BearerAuth).toBeDefined();
    const bearer = schemes.BearerAuth as Record<string, string>;
    expect(bearer.type).toBe("http");
    expect(bearer.scheme).toBe("bearer");
  });

  it("should have a global security requirement for BearerAuth", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;
    const security = spec.security as Array<Record<string, unknown>>;
    expect(security).toBeDefined();
    expect(Array.isArray(security)).toBe(true);
    expect(security.some((s) => "BearerAuth" in s)).toBe(true);
  });

  it("should include API v2 - Keys tag", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;
    const tags = spec.tags as Array<{ name: string }>;
    expect(tags.some((t) => t.name === "API v2 - Keys")).toBe(true);
  });

  it("should have BearerAuth on at least one concrete non-keys v2 path", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    expect(paths).toBeDefined();

    // Collect all operations on /api/v2/* paths excluding /api/v2/keys/issue
    const methods = ["get", "post", "put", "patch", "delete"];
    const protectedOps: Array<{
      path: string;
      method: string;
      security: unknown;
    }> = [];

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!path.startsWith("/api/v2/") || path === "/api/v2/keys/issue") {
        continue;
      }
      for (const method of methods) {
        const op = (pathItem as Record<string, unknown>)[method];
        if (op) {
          protectedOps.push({
            path,
            method,
            security: (op as Record<string, unknown>).security,
          });
        }
      }
    }

    expect(protectedOps.length).toBeGreaterThan(0);

    // Operations either inherit global API-key auth, declare a supported
    // operation-specific scheme, or explicitly opt into public access.
    const globalSecurity = spec.security as Array<Record<string, unknown>>;
    const globalHasBearerAuth = globalSecurity?.some((s) => "BearerAuth" in s);

    for (const op of protectedOps) {
      if (op.security === undefined) {
        expect(globalHasBearerAuth).toBe(true);
      } else {
        const opSecurity = op.security as Array<Record<string, unknown>>;
        const explicitlyPublic = opSecurity.length === 0;
        const hasSupportedAuth = opSecurity.some(
          (requirement) =>
            "BearerAuth" in requirement || "SupabaseJwtAuth" in requirement
        );
        expect(explicitlyPublic || hasSupportedAuth).toBe(true);
      }
    }
  });
});

describe("OpenAPI v2 spec - LanguageFamilyV2", () => {
  // @req REQ-036
  it("should document canonical associated peoples at the top level", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;
    const components = spec.components as Record<string, unknown>;
    const schemas = components.schemas as Record<string, unknown>;
    const languageFamily = schemas.LanguageFamilyV2 as Record<string, unknown>;
    const properties = languageFamily.properties as Record<string, unknown>;
    const associatedPeoples = properties.associatedPeoples as Record<
      string,
      unknown
    >;

    expect(associatedPeoples).toBeDefined();
    expect(associatedPeoples.type).toBe("array");
    expect(associatedPeoples.description).toContain(
      "afrik_peoples.language_family_id"
    );

    const items = associatedPeoples.items as Record<string, unknown>;
    const itemProperties = items.properties as Record<
      string,
      Record<string, unknown>
    >;

    expect(items.type).toBe("object");
    expect(itemProperties.name.type).toBe("string");
    expect(itemProperties.peopleId.type).toBe("string");
  });
});

describe("OpenAPI v2 spec - corpus envelopes", () => {
  const corpusResponses = [
    ["/api/v2/peoples", "#/components/schemas/PeoplesListEnvelope", [500]],
    [
      "/api/v2/peoples/{id}",
      "#/components/schemas/PeopleDetailEnvelope",
      [400, 404, 500],
    ],
    ["/api/v2/countries", "#/components/schemas/CountriesListEnvelope", [500]],
    [
      "/api/v2/countries/{iso}",
      "#/components/schemas/CountryDetailEnvelope",
      [400, 404, 500],
    ],
    [
      "/api/v2/language-families",
      "#/components/schemas/LanguageFamiliesListEnvelope",
      [500],
    ],
    [
      "/api/v2/language-families/{id}",
      "#/components/schemas/LanguageFamilyDetailEnvelope",
      [400, 404, 500],
    ],
  ] as const;

  // @req REQ-084
  it.each(corpusResponses)(
    "documents %s with success and error envelopes",
    (path, successSchema, errorStatuses) => {
      const spec = swaggerSpecV2 as Record<string, unknown>;
      const paths = spec.paths as Record<string, Record<string, unknown>>;
      const operation = paths[path].get as Record<string, unknown>;
      const responses = operation.responses as Record<
        string,
        { content: { "application/json": { schema: { $ref: string } } } }
      >;

      expect(responses["200"].content["application/json"].schema.$ref).toBe(
        successSchema
      );
      for (const status of errorStatuses) {
        expect(
          responses[String(status)].content["application/json"].schema.$ref
        ).toBe("#/components/schemas/ApiErrorEnvelope");
      }
    }
  );

  // @req REQ-084
  it("documents the same closed error taxonomy as the implementation", () => {
    const spec = swaggerSpecV2 as Record<string, unknown>;
    const components = spec.components as Record<string, unknown>;
    const schemas = components.schemas as Record<
      string,
      { properties: Record<string, { enum?: string[] }> }
    >;

    expect(schemas.ApiErrorEntry.properties.code.enum).toEqual([
      "ILLEGAL_TRANSITION",
      "INTERNAL_ERROR",
      "INVALID_PARAM",
      "NOT_FOUND",
      "RATE_LIMITED",
      "SEMANTIC_ERROR",
      "UNAUTHENTICATED",
      "UNAUTHORIZED",
      "UNAVAILABLE",
      "VALIDATION_ERROR",
    ]);
  });
});

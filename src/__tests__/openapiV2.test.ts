import { describe, it, expect } from "vitest";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";

describe("OpenAPI v2 spec - BearerAuth security", () => {
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
});

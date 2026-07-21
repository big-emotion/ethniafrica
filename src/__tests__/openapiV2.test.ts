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

    // Every protected operation should either inherit global BearerAuth (no security key)
    // or explicitly list BearerAuth in its security array
    const globalSecurity = spec.security as Array<Record<string, unknown>>;
    const globalHasBearerAuth = globalSecurity?.some((s) => "BearerAuth" in s);

    for (const op of protectedOps) {
      if (op.security === undefined) {
        // Inherits global security — BearerAuth must be in global
        expect(globalHasBearerAuth).toBe(true);
      } else {
        // Per-operation override — must include BearerAuth
        const opSecurity = op.security as Array<Record<string, unknown>>;
        expect(opSecurity.some((s) => "BearerAuth" in s)).toBe(true);
      }
    }
  });
});

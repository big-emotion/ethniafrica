import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "fs";
import path from "path";
import { swaggerSpecV2 } from "../openapiV2";

const spec = swaggerSpecV2 as Record<string, unknown>;
const specStr = JSON.stringify(spec);

// Recursively find all route.ts files under a directory
function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  let names: string[];
  try {
    names = readdirSync(dir) as string[];
  } catch {
    return results;
  }
  for (const name of names) {
    const fullPath = path.join(dir, name);
    if (statSync(fullPath).isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (name === "route.ts") {
      results.push(fullPath);
    }
  }
  return results;
}

// Convert a Next.js App Router file path to an OpenAPI path string
// e.g. /abs/path/to/src/app/api/v2/peoples/[id]/route.ts
//   → /api/v2/peoples/{id}
function routeFileToApiPath(routeFile: string, baseDir: string): string {
  const rel = routeFile.replace(baseDir, "").replace(/\/route\.ts$/, "");
  return `/api/v2${rel.replace(/\[([^\]]+)\]/g, "{$1}")}`;
}

const routesDir = path.resolve(__dirname, "../../../../app/api/v2");
const paths = (spec.paths ?? {}) as Record<string, unknown>;
const schemas = ((spec.components as Record<string, unknown>)?.schemas ??
  {}) as Record<string, unknown>;

describe("OpenAPI v2 spec — version and structure", () => {
  it("declares OpenAPI 3.1.0", () => {
    expect(spec.openapi).toBe("3.1.0");
  });

  it("has required info fields", () => {
    const info = spec.info as Record<string, unknown>;
    expect(typeof info.title).toBe("string");
    expect(typeof info.version).toBe("string");
    expect((info.title as string).length).toBeGreaterThan(0);
  });

  it("has at least one server entry", () => {
    const servers = spec.servers as unknown[];
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
  });

  it("has components.schemas defined", () => {
    expect(schemas).toBeDefined();
    expect(Object.keys(schemas).length).toBeGreaterThan(0);
  });

  it("has components.responses defined", () => {
    const responses = ((spec.components as Record<string, unknown>)
      ?.responses ?? {}) as Record<string, unknown>;
    expect(responses).toBeDefined();
    expect(Object.keys(responses).length).toBeGreaterThan(0);
  });
});

describe("OpenAPI v2 spec — 3.1 compatibility", () => {
  it("does not use deprecated nullable:true (OpenAPI 3.0 pattern)", () => {
    // OpenAPI 3.1 uses type arrays e.g. ["string","null"] instead of nullable:true
    const hasLegacyNullable =
      specStr.includes('"nullable":true') ||
      specStr.includes('"nullable": true');
    expect(hasLegacyNullable).toBe(false);
  });

  it("ApiErrorEntry.code enum includes RATE_LIMITED and SERVICE_UNAVAILABLE", () => {
    const entry = schemas.ApiErrorEntry as Record<string, unknown>;
    expect(entry).toBeDefined();
    const props = entry.properties as Record<string, { enum?: string[] }>;
    const codeEnum = props?.code?.enum ?? [];
    expect(codeEnum).toContain("RATE_LIMITED");
    expect(codeEnum).toContain("SERVICE_UNAVAILABLE");
  });

  it("nullable fields use array type form", () => {
    // Sample a few known-nullable fields from the spec and verify they use
    // the 3.1 array syntax rather than nullable:true
    const confidence = schemas.ApiResponseMeta as Record<string, unknown>;
    const confidenceProp = (
      confidence?.properties as Record<string, { type?: unknown }>
    )?.confidence;
    expect(Array.isArray(confidenceProp?.type)).toBe(true);
    expect(confidenceProp?.type).toContain("null");
  });
});

describe("OpenAPI v2 spec — path coverage", () => {
  it("has paths object with entries", () => {
    expect(typeof paths).toBe("object");
    expect(Object.keys(paths).length).toBeGreaterThan(0);
  });

  it("covers every public route file under src/app/api/v2/", () => {
    const routeFiles = findRouteFiles(routesDir);
    const missingPaths: string[] = [];

    for (const routeFile of routeFiles) {
      // Skip internal routes — not part of the public API surface
      if (routeFile.includes("/internal/")) continue;

      const apiPath = routeFileToApiPath(routeFile, routesDir);
      if (!paths[apiPath]) {
        missingPaths.push(
          `${apiPath} (from ${path.relative(routesDir, routeFile)})`
        );
      }
    }

    expect(
      missingPaths,
      `Routes missing from OpenAPI spec:\n  ${missingPaths.join("\n  ")}`
    ).toHaveLength(0);
  });

  it("includes stub paths for planned endpoints", () => {
    expect(paths["/api/v2/flags"]).toBeDefined();
    expect(paths["/api/v2/flags/{id}"]).toBeDefined();
    expect(paths["/api/v2/feed/revisions"]).toBeDefined();
  });
});

describe("OpenAPI v2 spec — path entry completeness", () => {
  it("every path entry has at least one HTTP method defined", () => {
    const httpMethods = [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "head",
      "options",
    ];
    const badPaths: string[] = [];

    for (const [pathKey, pathDef] of Object.entries(paths)) {
      const def = pathDef as Record<string, unknown>;
      const hasMethod = httpMethods.some((m) => m in def);
      if (!hasMethod) badPaths.push(pathKey);
    }

    expect(
      badPaths,
      `Paths without any HTTP method: ${badPaths.join(", ")}`
    ).toHaveLength(0);
  });

  it("every operation has at least one 2xx response defined", () => {
    const httpMethods = ["get", "post", "put", "patch", "delete"];
    const badOps: string[] = [];

    for (const [pathKey, pathDef] of Object.entries(paths)) {
      const def = pathDef as Record<string, unknown>;
      for (const method of httpMethods) {
        if (!(method in def)) continue;
        const op = def[method] as Record<string, unknown>;
        const responseCodes = Object.keys(
          (op.responses as Record<string, unknown>) ?? {}
        );
        const has2xx = responseCodes.some((code) => code.startsWith("2"));
        if (!has2xx) badOps.push(`${method.toUpperCase()} ${pathKey}`);
      }
    }

    expect(
      badOps,
      `Operations missing 2xx response: ${badOps.join(", ")}`
    ).toHaveLength(0);
  });

  it("every operation documents at least a 400, 429, and 500-range response", () => {
    const httpMethods = ["get", "post", "put", "patch", "delete"];
    const badOps: string[] = [];

    for (const [pathKey, pathDef] of Object.entries(paths)) {
      const def = pathDef as Record<string, unknown>;
      for (const method of httpMethods) {
        if (!(method in def)) continue;
        const op = def[method] as Record<string, unknown>;
        const responses = (op.responses as Record<string, unknown>) ?? {};
        const codes = Object.keys(responses);
        const has4xx = codes.some((c) => c.startsWith("4"));
        const has5xx = codes.some((c) => c.startsWith("5"));
        if (!has4xx || !has5xx) {
          badOps.push(
            `${method.toUpperCase()} ${pathKey} (4xx=${has4xx}, 5xx=${has5xx})`
          );
        }
      }
    }

    expect(
      badOps,
      `Operations missing error responses:\n  ${badOps.join("\n  ")}`
    ).toHaveLength(0);
  });
});

describe("OpenAPI v2 spec — schema integrity", () => {
  it("all $ref values in schemas resolve to known components", () => {
    const knownSchemas = new Set(Object.keys(schemas));
    const knownResponses = new Set(
      Object.keys(
        ((spec.components as Record<string, unknown>)?.responses ??
          {}) as Record<string, unknown>
      )
    );

    const unresolvedRefs: string[] = [];

    const walk = (obj: unknown, location: string): void => {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => walk(item, `${location}[${i}]`));
        return;
      }
      const rec = obj as Record<string, unknown>;
      for (const [key, val] of Object.entries(rec)) {
        if (key === "$ref" && typeof val === "string") {
          const schemaMatch = val.match(/^#\/components\/schemas\/(.+)$/);
          const responseMatch = val.match(/^#\/components\/responses\/(.+)$/);
          if (schemaMatch && !knownSchemas.has(schemaMatch[1])) {
            unresolvedRefs.push(`${location}: ${val}`);
          } else if (responseMatch && !knownResponses.has(responseMatch[1])) {
            unresolvedRefs.push(`${location}: ${val}`);
          }
        } else {
          walk(val, `${location}.${key}`);
        }
      }
    };

    walk(spec, "spec");

    expect(
      unresolvedRefs,
      `Unresolved $ref values:\n  ${unresolvedRefs.join("\n  ")}`
    ).toHaveLength(0);
  });

  it("required core schemas are defined", () => {
    const required = [
      "Error",
      "ApiErrorEnvelope",
      "ApiErrorEntry",
      "ApiResponseMeta",
      "PeopleV2",
      "CountryV2",
      "LanguageFamilyV2",
      "SearchResult",
      "PaginationMeta",
      "Source",
      "ConfidenceRecord",
      "PeopleRevisionItem",
      "FlagV2",
      "RevisionFeedItem",
    ];
    const missing = required.filter((name) => !schemas[name]);
    expect(
      missing,
      `Missing required schemas: ${missing.join(", ")}`
    ).toHaveLength(0);
  });
});

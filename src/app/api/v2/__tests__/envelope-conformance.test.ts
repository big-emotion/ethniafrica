import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTES_ROOT = join(process.cwd(), "src/app/api/v2");

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findRouteFiles(path);
    }

    return entry.name === "route.ts" ? [path] : [];
  });
}

function displayPath(path: string): string {
  return relative(process.cwd(), path);
}

describe("API v2 envelope conformance", () => {
  // @req REQ-084
  it("rejects raw response bodies in every v2 route", () => {
    const rawBodyPatterns = [
      /(?:jsonWithCors|NextResponse\.json|Response\.json)\s*\(\s*\{\s*data(?:\s*[:,}])/m,
      /(?:jsonWithCors|NextResponse\.json|Response\.json)\s*\(\s*\{\s*error(?:\s*[:,}])/m,
      /(?:jsonWithCors|NextResponse\.json|Response\.json)\s*\(\s*\[/m,
    ];
    const routeFiles = findRouteFiles(ROUTES_ROOT);
    const violations = routeFiles.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return rawBodyPatterns.some((pattern) => pattern.test(source))
        ? [displayPath(path)]
        : [];
    });

    expect(routeFiles.length).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });

  // @req REQ-084
  it("routes all six corpus endpoints through the standard envelope helpers", () => {
    const resourceFiles = [
      "src/api/v2/handlers/peoples.ts",
      "src/app/api/v2/peoples/route.ts",
      "src/app/api/v2/peoples/[id]/route.ts",
      "src/api/v2/handlers/countries.ts",
      "src/app/api/v2/countries/route.ts",
      "src/app/api/v2/countries/[iso]/route.ts",
      "src/api/v2/handlers/languageFamilies.ts",
      "src/app/api/v2/language-families/route.ts",
      "src/app/api/v2/language-families/[id]/route.ts",
    ];
    const source = resourceFiles
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");

    expect(source).toContain("createApiResponse");
    expect(source).toContain("createApiError");
    expect(source).not.toContain("createPaginatedResponse");
    expect(source).not.toContain("createResponse");
  });
});

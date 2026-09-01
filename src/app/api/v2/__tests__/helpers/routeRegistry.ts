/**
 * Filesystem-driven bridge between the OpenAPI spec (src/lib/api/openapiV2.ts)
 * and the actual route files under src/app/api/v2/**\/route.ts.
 *
 * The contract suite (contract.test.ts) needs, for every documented
 * path+method: the route module to call, and the handler module(s) it
 * imports so they can be mocked. Both are derived here instead of hand-listed
 * per endpoint, so a route added without wiring it into the suite is a gap
 * the coverage check in contract.test.ts catches by construction rather than
 * one more fixture someone forgot to add.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// @req REQ-033
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

// Relative to this file (src/app/api/v2/__tests__/helpers/); two levels up
// is src/app/api/v2/, the root every /v2 route lives under.
const routeLoaders = import.meta.glob("../../**/route.ts");

export interface DiscoveredRoute {
  /** e.g. "/api/v2/countries/{iso}" — Next.js's [iso] rewritten to match the spec. */
  specPath: string;
  /**
   * specPath with every `{…}` collapsed to `*`, for matching a route file to
   * its spec entry by position rather than by name — a dynamic segment's
   * Next.js folder name (`[id]`) has no obligation to match the name the
   * spec gives that same parameter (`{public_slug_or_id}`); only the URL
   * shape has to line up.
   */
  shape: string;
  /** Folder bracket names in path order, e.g. ["id"] for flags/[id]/route.ts. */
  dynamicSegmentNames: string[];
  absPath: string;
  load: () => Promise<Record<string, unknown>>;
}

function shapeOf(path: string): string {
  return path.replace(/\{[^}]+\}|\[[^\]]+\]/g, "*");
}

function keyToRouteInfo(key: string): {
  specPath: string;
  dynamicSegmentNames: string[];
} {
  const withoutRelativePrefix = key.replace(/^(\.\.\/)+/, "");
  const withoutFile = withoutRelativePrefix.replace(/\/route\.ts$/, "");
  const dynamicSegmentNames: string[] = [];
  const segments = withoutFile.split("/").map((segment) => {
    const match = segment.match(/^\[(.+)\]$/);
    if (!match) return segment;
    dynamicSegmentNames.push(match[1]);
    return `{${match[1]}}`;
  });
  return { specPath: `/api/v2/${segments.join("/")}`, dynamicSegmentNames };
}

let cachedRoutes: DiscoveredRoute[] | null = null;

// @req REQ-033
export function discoverRoutes(): DiscoveredRoute[] {
  if (!cachedRoutes) {
    cachedRoutes = Object.entries(routeLoaders).map(([key, load]) => {
      const { specPath, dynamicSegmentNames } = keyToRouteInfo(key);
      return {
        specPath,
        shape: shapeOf(specPath),
        dynamicSegmentNames,
        absPath: fileURLToPath(new URL(key, import.meta.url)),
        load: load as () => Promise<Record<string, unknown>>,
      };
    });
  }
  return cachedRoutes;
}

/** Matches by URL shape, not literal param names — see DiscoveredRoute.shape. */
// @req REQ-033
export function findRoute(specPath: string): DiscoveredRoute | undefined {
  const target = shapeOf(specPath);
  return discoverRoutes().find((route) => route.shape === target);
}

export interface HandlerImport {
  specifier: string;
  names: string[];
}

/**
 * Named exports a route.ts imports from `@/api/v2/handlers/*`, grouped by
 * module specifier — read straight from source (the same static-analysis
 * approach envelope-conformance.test.ts already uses) so mocking never
 * depends on a hand-maintained "route -> handler" table.
 */
// @req REQ-033
export function extractHandlerImports(absPath: string): HandlerImport[] {
  const source = readFileSync(absPath, "utf-8");
  const importRe =
    /import\s*\{([^}]+)\}\s*from\s*["'](@\/api\/v2\/handlers\/[^"']+)["']/g;
  const bySpecifier = new Map<string, Set<string>>();

  for (const match of source.matchAll(importRe)) {
    const names = match[1]
      .split(",")
      .map((name) => name.replace(/\btype\b/, "").trim())
      .filter(Boolean)
      // `type Foo` (type-only named imports) has no runtime export to mock.
      .filter((name) => !match[1].includes(`type ${name}`));
    const specifier = match[2];
    const set = bySpecifier.get(specifier) ?? new Set<string>();
    names.forEach((name) => set.add(name));
    bySpecifier.set(specifier, set);
  }

  return [...bySpecifier.entries()].map(([specifier, names]) => ({
    specifier,
    names: [...names],
  }));
}

/**
 * Four response conventions coexist across src/app/api/v2, so the mocked
 * handler value has to satisfy all of them at once rather than picking one:
 *  - most routes pass the handler's return straight to `jsonWithCors(response)`
 *    (envelope fields read at the top level, status defaults to 200 — every
 *    such route's success is 200);
 *  - flags/keys/reference-library/antibot go through a
 *    `responseFromHandler({body,status})` helper and read `.body`/`.status`;
 *  - compare destructures specific fields off the result
 *    (`result.entityType`, `result.entities`) and rebuilds the envelope itself;
 *  - migrations/relations/peoples-subresources/quiz/language-families-tree
 *    return `{ok, envelope}` and forward `result.envelope` unchanged.
 * JSON Schema has no `additionalProperties: false` anywhere in this spec's
 * envelopes, so the extra keys below are silently ignored by whichever
 * convention doesn't use them, instead of failing validation.
 */
// @req REQ-033
export function composeHandlerMockValue(
  envelope: unknown,
  successStatus: number
): unknown {
  const data =
    envelope && typeof envelope === "object" && "data" in envelope
      ? (envelope as { data: unknown }).data
      : undefined;
  return {
    ...(envelope as object),
    ...(data && typeof data === "object" ? data : {}),
    ok: true,
    status: successStatus,
    body: envelope,
    envelope,
  };
}

/** A clearly-invalid value: violates any realistic pattern/enum/type in this spec. */
// @req REQ-033
export function invalidValueFor(schema: {
  pattern?: string;
  enum?: unknown[];
  type?: string;
}): string {
  if (schema.enum) return "__not_a_documented_enum_value__";
  if (schema.type === "integer" || schema.type === "number")
    return "not-a-number";
  // Every path-param pattern in this spec is an uppercase-prefix/format
  // convention (^[A-Z]{3}$, ^PPL_[A-Z_]+$, …) — lowercase + symbols breaks all of them.
  return "!!!invalid!!!";
}

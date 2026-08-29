import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { deriveTrail } from "@/lib/navigation/deriveTrail";

/**
 * The trail's coverage contract: every route of the site carries one.
 *
 * This is the assertion the previous arrangement could not make. The trail was
 * mounted by four fiche components, so it existed exactly where someone had
 * remembered to put it — the three fiches and one module — and was absent from
 * the other thirty-two routes, the three hubs and every game included. Nothing
 * failed, because nothing was watching the routes as a set.
 *
 * So this test reads the route tree off the filesystem rather than a list.
 * A list would have to be updated by the same person who forgot the mount, and
 * would agree with them.
 *
 * Two things have to hold for a reader to actually see a trail, and both are
 * checked, because either alone is a green test over a broken page:
 *
 *  1. the route's path must *derive* a trail — `deriveTrail` must have words
 *     for it, or it returns nothing and the component renders null;
 *  2. the route must *mount* one — reachable through its own imports or
 *     through a layout above it.
 */

const APP_ROOT = path.join(process.cwd(), "src", "app", "[lang]");
const SRC_ROOT = path.join(process.cwd(), "src");

/** The two modules that put a trail on screen. Anything else is indirection. */
const TRAIL_MOUNTS = [
  "components/layout/SiteTrail",
  "components/layout/AfrikBreadcrumbs",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const routeFiles = walk(APP_ROOT).filter(
  (file) => path.basename(file) === "page.tsx"
);

/**
 * The URL a route file addresses, with each dynamic segment replaced by a
 * value of the shape the real one has.
 *
 * A trail is derived from an address, so a test about trails has to work in
 * addresses. `[slug]` becomes an identifier the segment table cannot name on
 * purpose: it is the case that exercises the entity-label rule, and a slug
 * that happened to collide with a table entry would pass for the wrong reason.
 */
function routeToPath(file: string): string {
  const segments = path
    .relative(APP_ROOT, path.dirname(file))
    .split(path.sep)
    .filter((segment) => segment && !segment.startsWith("("))
    .map((segment) =>
      segment.startsWith("[") ? "IDENTIFIER_PLACEHOLDER" : segment
    );

  return ["/fr", ...segments].join("/").replace(/\/$/, "");
}

/** Resolve a `@/` import to a file under `src`, or null for a package. */
function resolveImport(specifier: string): string | null {
  if (!specifier.startsWith("@/")) return null;
  const base = path.join(SRC_ROOT, specifier.slice(2));
  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not this extension; try the next.
    }
  }
  return null;
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/from\s+"(@\/[^"]+)"/g)].map((match) => match[1]);
}

/**
 * Whether a trail mount is reachable from a file, following `@/` imports.
 *
 * Depth-limited and memoized: the point is to catch a route that mounts
 * nothing, not to type-check the graph.
 */
function reachesTrailMount(
  file: string,
  seen = new Set<string>(),
  depth = 0
): boolean {
  if (depth > 6 || seen.has(file)) return false;
  seen.add(file);

  for (const specifier of importsOf(file)) {
    if (TRAIL_MOUNTS.some((mount) => specifier === `@/${mount}`)) return true;
    const resolved = resolveImport(specifier);
    if (resolved && reachesTrailMount(resolved, seen, depth + 1)) return true;
  }
  return false;
}

/** Every `layout.tsx` sitting above a route, nearest last. */
function layoutsAbove(file: string): string[] {
  const layouts: string[] = [];
  let dir = path.dirname(file);

  while (dir.startsWith(APP_ROOT)) {
    const layout = path.join(dir, "layout.tsx");
    try {
      if (statSync(layout).isFile()) layouts.push(layout);
    } catch {
      // No layout at this level.
    }
    dir = path.dirname(dir);
  }
  return layouts;
}

describe("every route of the site carries a trail", () => {
  // @req REQ-115
  it("finds the whole route tree, so the set under test is the real one", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(37);
  });

  // @req REQ-115
  it("derives a trail for every route address", () => {
    const withoutTrail = routeFiles
      .map((file) => routeToPath(file))
      .filter((route) => deriveTrail(route, "Nom lisible").length === 0);

    expect(withoutTrail).toEqual([]);
  });

  /**
   * The home is the one route whose trail is a single crumb; every other
   * route names at least the home and itself. A route that derived only the
   * home crumb would be one the segment table has no words for — a trail that
   * renders, but says nothing about where the reader is.
   */
  // @req REQ-115
  it("names every route beyond the bare way home", () => {
    const unnamed = routeFiles
      .map((file) => routeToPath(file))
      .filter((route) => route !== "/fr")
      .filter((route) => deriveTrail(route, "Nom lisible").length < 2);

    expect(unnamed).toEqual([]);
  });

  // @req REQ-115
  it("mounts a trail on every route, through the shell or directly", () => {
    const unmounted = routeFiles.filter(
      (file) =>
        !reachesTrailMount(file) &&
        !layoutsAbove(file).some((layout) => reachesTrailMount(layout))
    );

    expect(unmounted.map((file) => path.relative(APP_ROOT, file))).toEqual([]);
  });

  /**
   * The trail is mounted once, in the shell. A page mounting its own on top of
   * the shell's would render two — which is what the four fiche components did
   * to each other before the mount moved, and the reason a page that wants a
   * different label passes `trailLabel` rather than a second component.
   */
  // @req REQ-115
  it("mounts the trail directly only where no shell provides one", () => {
    const shellless = routeFiles.filter(
      (file) =>
        !importsOf(file).includes("@/components/layout/PageLayout") &&
        importsOf(file).includes("@/components/layout/SiteTrail")
    );
    const doubled = routeFiles.filter(
      (file) =>
        importsOf(file).includes("@/components/layout/PageLayout") &&
        importsOf(file).includes("@/components/layout/SiteTrail")
    );

    expect(doubled).toEqual([]);
    expect(shellless.length).toBeGreaterThan(0);
  });
});

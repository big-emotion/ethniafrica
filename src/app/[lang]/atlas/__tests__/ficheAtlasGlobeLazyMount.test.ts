import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * ETNI-1378 / ETNI-1478 — the three fiche routes (familles, pays, peuples)
 * statically imported AtlasGlobe, so its whole client bundle (marker
 * placement, camera hooks, target picker, facts panel, SVG fallback — every
 * effect it runs) evaluated and hydrated as one synchronous task with the
 * rest of the page. The hub routes (ExplorerContinent, FacetGlobeIsland)
 * already load AtlasGlobe through `next/dynamic`, which code-splits it into
 * its own chunk and lets React hydrate the rest of the page without waiting
 * on it — the difference that keeps their Total Blocking Time under budget
 * while the fiche routes blew 2.9-3.7s against a 300ms budget (reference
 * run: github.com/big-emotion/ethniafrica/actions/runs/33368057398).
 *
 * `ssr: false` is deliberately not required here (unlike the hub's usage):
 * the fiche globe is the page's hero, so its server-rendered fallback still
 * has to reach the first paint for LCP. Only the static-import mechanism —
 * the actual cause of the oversized hydration task — needs to go.
 */
const FICHE_PAGES = [
  "familles/[slug]/page.tsx",
  "pays/[slug]/page.tsx",
  "peuples/[slug]/page.tsx",
] as const;

const STATIC_IMPORT_PATTERN =
  /import\s*\{\s*AtlasGlobe\s*\}\s*from\s*["']@\/components\/atlas\/AtlasGlobe["']/;
const DYNAMIC_IMPORT_PATTERN =
  /dynamic\(\s*\(\)\s*=>\s*import\(\s*["']@\/components\/atlas\/AtlasGlobe["']\s*\)/;

describe("fiche routes mount AtlasGlobe through next/dynamic", () => {
  for (const relativePath of FICHE_PAGES) {
    // @req REQ-112
    test(`${relativePath} does not statically import AtlasGlobe`, () => {
      const source = readFileSync(
        path.join(__dirname, "..", relativePath),
        "utf8"
      );
      expect(source).not.toMatch(STATIC_IMPORT_PATTERN);
    });

    // @req REQ-112
    test(`${relativePath} lazily loads AtlasGlobe via next/dynamic`, () => {
      const source = readFileSync(
        path.join(__dirname, "..", relativePath),
        "utf8"
      );
      expect(source).toMatch(DYNAMIC_IMPORT_PATTERN);
    });
  }
});

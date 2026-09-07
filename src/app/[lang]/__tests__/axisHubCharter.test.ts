import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { ACCESS_MODES } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";

const fromRoot = (relativePath: string) => resolve(process.cwd(), relativePath);

/**
 * The route folder each axis's hub is served from.
 *
 * The French segment, because `[lang]` holds the French route tree and the
 * English slugs are rewritten onto it by `src/middleware.ts` (DEC-049) — so a
 * folder named after the English slug would be a folder nothing reaches.
 */
const HUB_ROUTE_DIR: Record<string, string> = Object.fromEntries(
  ACCESS_MODES.map((axis) => [
    axis,
    getLocalizedRoute("fr", `${axis}Hub` as never).slice("/fr/".length),
  ])
);

const NESTED_PAGES = [
  "src/app/[lang]/atlas/peuples/page.tsx",
  "src/app/[lang]/dossiers/anecdotes/page.tsx",
  "src/app/[lang]/jeux/[jeu]/page.tsx",
] as const;

/**
 * The three axis hubs, back on one spread (brand charter §8.6).
 *
 * This file replaces `axisHubRemovalCharter.test.ts`, which asserted that two
 * of these pages did *not* exist. ETNI-1555 removed them for a fault of the
 * band they carried — viewport-tall and bottom-aligned, so the title sat under
 * a screen of empty parchment — and the pages came back on 7 September 2026
 * once that band was replaced by a composition that fills the height it asks
 * for, and only asks where its axis has the tiles to fill it.
 *
 * Kept as a route-level file rather than folded into the component's contract
 * because what went wrong last time was a *page*: the hubs were reachable,
 * indexed and linked while being unreadable. A component test cannot see that.
 */
describe("the axis hubs — three addresses, one spread", () => {
  // @req REQ-114
  it("serves a page at every axis hub route", () => {
    for (const axis of ACCESS_MODES) {
      const page = `src/app/[lang]/${HUB_ROUTE_DIR[axis]}/page.tsx`;
      expect(existsSync(fromRoot(page)), page).toBe(true);
    }
  });

  // @req REQ-114
  it("leaves the routes nested under each axis untouched", () => {
    for (const nested of NESTED_PAGES) {
      expect(existsSync(fromRoot(nested)), nested).toBe(true);
    }
  });

  /**
   * Every hub reads the one page module, so a change to the spread reaches all
   * three. Three hand-written pages is what let the retired hubs become three
   * different surfaces sharing a name.
   */
  // @req REQ-114
  it("builds all three from the shared axis-hub page", () => {
    for (const axis of ACCESS_MODES) {
      const source = readFileSync(
        fromRoot(`src/app/[lang]/${HUB_ROUTE_DIR[axis]}/page.tsx`),
        "utf8"
      );

      expect(source, axis).toContain("@/components/hubs/axisHubPage");
      expect(source, axis).toContain(`axis="${axis}"`);
    }
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Which surfaces open on the shell's band.
 *
 * `hideHeader` is the shell's opt-out, and the five surfaces a reader actually
 * comes to the atlas for had all taken it: the three fiches and the three
 * facets each raised their own head instead, in their own box, above their own
 * globe. Two consequences, both visible on the site. Each surface started with
 * a bare title on the page ground where every other route gets a plate, so the
 * one thing all six have in common was the one thing that looked different on
 * each. And the trail, which lives in the plate, fell back to a container of
 * its own — the two-boxes-two-verticals fault the plate was built to end.
 *
 * They opted out for a real reason: the band composed its own h1 from `title`,
 * and a fiche that already names itself would then have had two. `heroHead`
 * removes the reason — the page hands its head to the plate, and the plate
 * composes nothing beside it.
 *
 * Asserted against the source because the alternative is standing up three
 * async route components against Supabase to observe one prop. The check is
 * narrow enough to stay honest: it reads what each route passes the shell.
 */
const read = (path: string): string =>
  readFileSync(join(process.cwd(), path), "utf8");

/** Every surface that opens on a globe and names its own subject. */
const SURFACES = [
  "src/app/[lang]/explorer/pays/[slug]/page.tsx",
  "src/app/[lang]/explorer/peuples/[slug]/page.tsx",
  "src/app/[lang]/explorer/familles/[slug]/page.tsx",
  "src/components/hubs/facets/FacetHubShell.tsx",
] as const;

describe("the hero band — the fiches and the facets open on it too (REQ-115)", () => {
  for (const surface of SURFACES) {
    // @req REQ-115
    it(`raises the shell band on ${surface}`, () => {
      const source = read(surface);

      expect(source).toMatch(/heroHead=\{/);
      expect(source).not.toMatch(/^\s*hideHeader\b/m);
    });
  }

  /**
   * The wait and the page it resolves into are one shell — React reconciles
   * the two trees, so a loading screen that raised no band would show the
   * chrome collapsing and re-expanding around the fiche as it lands.
   */
  // @req REQ-104
  it("raises the same band while a fiche is still loading", () => {
    const source = read("src/components/fiche/FicheLoadingScreen.tsx");

    expect(source).not.toMatch(/\bhideHeader\b/);
  });
});

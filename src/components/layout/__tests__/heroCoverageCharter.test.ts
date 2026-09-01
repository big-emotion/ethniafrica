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
  "src/app/[lang]/atlas/pays/[slug]/page.tsx",
  "src/app/[lang]/atlas/peuples/[slug]/page.tsx",
  "src/app/[lang]/atlas/familles/[slug]/page.tsx",
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
   * The wait is the exception, and it is the counterpart of the rule above
   * rather than a hole in it (brand charter §8.4).
   *
   * The clause here used to be the opposite one — the wait raised the band so
   * the chrome would not collapse and re-expand around the arriving fiche.
   * Nothing in the wait survives into that fiche to be kept still: the plate
   * that said "Pays" is replaced by the plate that says "Afrique du Sud", and
   * the body is swapped whole. What the band did buy was a viewport-tall
   * night stage that pushed the fact below the fold, on the routes that wait
   * longest, so the wait state shipped nothing readable at all.
   *
   * The band is matched on its *import*: the screen names it in the comment
   * recording why it no longer raises one, and a gate reading the whole
   * source would call that comment the violation.
   */
  // @req REQ-104
  it("raises no band while a fiche is still loading, so the fact keeps the fold", () => {
    const source = read("src/components/fiche/FicheLoadingScreen.tsx");

    expect(source).toMatch(/\bhideHeader\b/);
    expect(source).not.toMatch(/^import[^;]*\bFicheHeroBand\b/m);
  });
});

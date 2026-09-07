import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every fiche offers a way out, and the route is where it is composed.
 *
 * Two things this pins, both of which have already gone wrong once here:
 *
 * **All five, not three.** The measurement that started this (production,
 * 2026-09-07) found a 100 % exit rate on a people, a family, two countries and
 * a patronyme alike. A block wired into the two routes that were easiest to
 * reach would leave the others exactly as they were, and nothing else in the
 * suite would notice — the SEO baseline beside this file covers four of the
 * five routes for the same reason.
 *
 * **Composed in the route, never in the shell.** The links come from awaited
 * services. `FicheJsonLd` records what happens when such a thing is mounted
 * inside `FicheSequence` instead: the shell becomes async, every synchronous
 * render of it resolves to an empty div, and thirty-three tests across five
 * files fail with messages that name none of this.
 */
const FICHE_ROUTES = [
  "src/app/[lang]/atlas/peuples/[slug]/page.tsx",
  "src/app/[lang]/atlas/pays/[slug]/page.tsx",
  "src/app/[lang]/atlas/familles/[slug]/page.tsx",
  "src/app/[lang]/atlas/noms/[slug]/page.tsx",
  "src/app/[lang]/atlas/langues/[slug]/page.tsx",
] as const;

function sourceOf(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("the Poursuivre block is composed by every fiche route", () => {
  for (const route of FICHE_ROUTES) {
    describe(route, () => {
      // @req REQ-091
      it("mounts the block its shell cannot", () => {
        expect(sourceOf(route)).toContain("<FicheOnward");
      });

      // @req REQ-091
      it("hands it to the parchment rather than to the shell", () => {
        expect(sourceOf(route)).toMatch(/onward=\{/);
      });
    });
  }

  // @req REQ-091
  it("keeps the block out of the shell, which renders synchronously", () => {
    expect(sourceOf("src/components/fiche/FicheSequence.tsx")).not.toContain(
      "FicheOnward"
    );
  });
});

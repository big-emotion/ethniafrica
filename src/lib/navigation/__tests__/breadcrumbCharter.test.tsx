import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { deriveTrail } from "@/lib/navigation/deriveTrail";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { ContextTriad } from "@/components/fiche/ContextTriad";
import {
  PAGE_TYPES,
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { YORUBA } from "@/components/fiche/__tests__/ficheContextFixtures";

/**
 * The trail's contract, in one file so the rule and its consequences stay
 * readable together.
 *
 * The rule: a trail is *derived* from the path the reader is on, never
 * assembled by hand at the call site. Five call sites each wrote their own
 * hierarchy, which is how the people fiche came to open on "Familles" while
 * the country fiche opened on a people — provenance dressed up as ancestry.
 *
 * Its corollary, and the reason this file asserts absences as often as
 * presences: never print a segment you cannot name. A raw `PPL_YORUBA` or
 * `BEN` in a crumb is worse than a shorter trail, because it looks like a
 * label and reads like debris.
 */

describe("deriveTrail — the trail comes from the route", () => {
  // @req REQ-091
  it("opens on the home and the axis that leads to the page", () => {
    expect(deriveTrail(getLocalizedRoute("fr", "countries"))).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Explorer", href: getLocalizedRoute("fr", "explorerHub") },
      { label: "Pays" },
    ]);
  });

  /**
   * `Accueil › Explorer › Explorer` would name the same place twice, and the
   * charter already rules on that shape: a level offering no choice is not a
   * level.
   */
  // @req REQ-091
  it("does not repeat the axis on the axis hub itself", () => {
    expect(deriveTrail(getLocalizedRoute("fr", "explorerHub"))).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Explorer" },
    ]);
  });

  /**
   * A page no axis leads to still gets a way home. Two crumbs, honest about
   * being an escape hatch rather than a hierarchy — inventing a parent for the
   * legal pages would be inventing a claim about the site's shape.
   */
  // @req REQ-091
  it("gives a page outside the three axes the home and itself, nothing more", () => {
    expect(deriveTrail(getLocalizedRoute("fr", "compare"))).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Comparer" },
    ]);
  });

  // @req REQ-091
  it("gives every page type a crumb, so no route trails off unnamed", () => {
    for (const page of PAGE_TYPES) {
      const trail = deriveTrail(getLocalizedRoute("fr", page));

      // Home, optionally the axis, then the page itself.
      expect(trail.length).toBeGreaterThanOrEqual(2);
      expect(trail[0]).toEqual({ label: "Accueil", href: "/fr" });
      for (const crumb of trail) {
        expect(crumb.label.length).toBeGreaterThan(0);
      }
      // The reader stands on the last one.
      expect(trail[trail.length - 1].href).toBeUndefined();
    }
  });

  // @req REQ-091
  it("opens a fiche's trail on its own hub, at the route the slug table gives", () => {
    expect(deriveTrail(getCountryRoute("fr", "BEN"), "Bénin")).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Explorer", href: getLocalizedRoute("fr", "explorerHub") },
      { label: "Pays", href: getLocalizedRoute("fr", "countries") },
      { label: "Bénin" },
    ]);
    expect(deriveTrail(getFamilyRoute("fr", "FLG_KHOE"), "Khoe-Kwadi")).toEqual(
      [
        { label: "Accueil", href: "/fr" },
        { label: "Explorer", href: getLocalizedRoute("fr", "explorerHub") },
        { label: "Familles", href: getLocalizedRoute("fr", "families") },
        { label: "Khoe-Kwadi" },
      ]
    );
  });

  // @req REQ-091
  it("names a sub-route below a fiche and keeps the fiche reachable", () => {
    expect(
      deriveTrail(getPeopleLinksRoute("fr", "PPL_YORUBA"), "Yoruba")
    ).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Explorer", href: getLocalizedRoute("fr", "explorerHub") },
      { label: "Peuples", href: getLocalizedRoute("fr", "peoples") },
      { label: "Yoruba", href: getPeopleRoute("fr", "PPL_YORUBA") },
      { label: "Liens" },
    ]);
  });

  // @req REQ-091
  it("stops rather than print an identifier it was given no label for", () => {
    const trail = deriveTrail(getCountryRoute("fr", "BEN"));

    expect(trail).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Explorer", href: getLocalizedRoute("fr", "explorerHub") },
      { label: "Pays", href: getLocalizedRoute("fr", "countries") },
    ]);
    expect(JSON.stringify(trail)).not.toContain("BEN");
  });

  // @req REQ-091
  it("stops at the first segment it has no words for", () => {
    const trail = deriveTrail(
      `${getPeopleRoute("fr", "PPL_YORUBA")}/tresor-cache`,
      "Yoruba"
    );

    expect(trail.map((crumb) => crumb.label)).toEqual([
      "Accueil",
      "Explorer",
      "Peuples",
      "Yoruba",
    ]);
    expect(JSON.stringify(trail)).not.toContain("tresor-cache");
  });

  // @req REQ-091
  it("returns no trail at all for a path outside the slug table", () => {
    expect(deriveTrail("/fr/nulle-part")).toEqual([]);
    expect(deriveTrail("/de/pays")).toEqual([]);
    expect(deriveTrail("/")).toEqual([]);
  });

  // @req REQ-091
  it("carries the identifier through verbatim, encoding included", () => {
    const trail = deriveTrail(getPeopleLinksRoute("fr", "PPL_%2F%2Fevil"), "X");

    const fiche = trail.find((crumb) => crumb.label === "X");
    expect(trail.at(-2)?.href).toBe(getPeopleRoute("fr", "PPL_%2F%2Fevil"));
    expect(fiche).toBeDefined();
  });
});

describe("the trail a fiche renders", () => {
  // @req REQ-115
  it("marks the last crumb as where the reader is, and links the rest", () => {
    render(
      <AfrikBreadcrumbs
        items={deriveTrail(getCountryRoute("fr", "BEN"), "Bénin")}
      />
    );

    expect(
      screen.getByRole("link", { name: "Pays" }).getAttribute("href")
    ).toBe(getLocalizedRoute("fr", "countries"));
    expect(screen.getByText("Bénin").getAttribute("aria-current")).toBe("page");
  });

  /**
   * The consequence the owner accepted when the trail became derived: a
   * people's family is no longer an ancestor in the URL, so it is no longer a
   * crumb. It must not therefore vanish from the page — the triad is what
   * carries it, and this is the assertion that keeps that true.
   */
  // @req REQ-091
  it("keeps the family reachable from a people fiche once the crumb is gone", () => {
    expect(
      deriveTrail(getPeopleRoute("fr", "PPL_YORUBA"), "Yoruba").map(
        (crumb) => crumb.label
      )
    ).toEqual(["Accueil", "Explorer", "Peuples", "Yoruba"]);

    const { container } = render(
      <ContextTriad context={{ entityType: "people", payload: YORUBA }} />
    );

    const familyChip = container.querySelector(
      '[data-context-triad-kind="family"] a'
    );
    expect(familyChip?.getAttribute("href")).toBe(
      getFamilyRoute("fr", YORUBA.languageFamilyId)
    );
    expect(familyChip?.textContent?.length).toBeGreaterThan(0);
  });
});

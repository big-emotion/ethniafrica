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
  it("names a hub page and leaves it unlinked, the reader being on it", () => {
    expect(deriveTrail(getLocalizedRoute("fr", "countries"))).toEqual([
      { label: "Pays" },
    ]);
  });

  // @req REQ-091
  it("gives every page type a crumb, so no route trails off unnamed", () => {
    for (const page of PAGE_TYPES) {
      const trail = deriveTrail(getLocalizedRoute("fr", page));
      expect(trail).toHaveLength(1);
      expect(trail[0].label.length).toBeGreaterThan(0);
      expect(trail[0].href).toBeUndefined();
    }
  });

  // @req REQ-091
  it("opens a fiche's trail on its own hub, at the route the slug table gives", () => {
    expect(deriveTrail(getCountryRoute("fr", "BEN"), "Bénin")).toEqual([
      { label: "Pays", href: getLocalizedRoute("fr", "countries") },
      { label: "Bénin" },
    ]);
    expect(deriveTrail(getFamilyRoute("fr", "FLG_KHOE"), "Khoe-Kwadi")).toEqual(
      [
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
      { label: "Peuples", href: getLocalizedRoute("fr", "peoples") },
      { label: "Yoruba", href: getPeopleRoute("fr", "PPL_YORUBA") },
      { label: "Liens" },
    ]);
  });

  // @req REQ-091
  it("stops rather than print an identifier it was given no label for", () => {
    const trail = deriveTrail(getCountryRoute("fr", "BEN"));

    expect(trail).toEqual([
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

    expect(trail.map((crumb) => crumb.label)).toEqual(["Peuples", "Yoruba"]);
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

    expect(trail[1].href).toBe("/fr/peuples/PPL_%2F%2Fevil");
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
    ).toBe("/fr/pays");
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
    ).toEqual(["Peuples", "Yoruba"]);

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

import { describe, expect, it } from "vitest";

import { heroVariantForPath } from "@/lib/layout/heroVariant";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { ACCESS_MODES } from "@/lib/hubs/moduleRegistry";
import {
  getCountryRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";

/**
 * Which hero a page opens on is a property of the route, not a prop a page
 * author remembers to pass. Twenty-odd routes each choosing for themselves is
 * how the shell arrived at four widths and five gutters in the first place.
 *
 * The rule the brief sets: the home and the three axis hubs are entry points
 * and open on a viewport-height band; every other page is a destination and
 * opens on a short one.
 *
 * Routes are composed from the slug table here for the same reason the module
 * derives them: a literal in the test would keep passing after a hub is
 * renamed, and would be asserting the rename had not happened.
 */
const home = "/fr";

describe("hero variant — the entry points, and everything else (REQ-115)", () => {
  // @req REQ-115
  it("gives the home the immersive band", () => {
    expect(heroVariantForPath(home)).toBe("immersive");
    expect(heroVariantForPath(`${home}/`)).toBe("immersive");
  });

  // @req REQ-115
  it("gives each of the three axis hubs the immersive band", () => {
    for (const mode of ACCESS_MODES) {
      expect(heroVariantForPath(getAxisHubRoute("fr", mode))).toBe("immersive");
    }
  });

  // A hub's children are destinations, not entry points: the explorer hub
  // opens the axis, the countries directory is already inside it.
  // @req REQ-115
  it("gives a page below a hub the compact band", () => {
    expect(heroVariantForPath(getLocalizedRoute("fr", "countries"))).toBe(
      "compact"
    );
    expect(heroVariantForPath(getCountryRoute("fr", "ZAF"))).toBe("compact");
    expect(heroVariantForPath(getPeopleRoute("fr", "PPL_ZULU"))).toBe(
      "compact"
    );
    expect(heroVariantForPath(getLocalizedRoute("fr", "quiz"))).toBe("compact");
  });

  // @req REQ-115
  it("gives a page outside the three axes the compact band", () => {
    expect(heroVariantForPath(getLocalizedRoute("fr", "about"))).toBe(
      "compact"
    );
  });

  // A query string or a fragment names a state of the page, never a different
  // page: the anecdote route is the anecdote route with or without `?a=`.
  // @req REQ-115
  it("reads the path only, never the query or the fragment", () => {
    expect(heroVariantForPath(`${home}?x=1`)).toBe("immersive");
    expect(
      heroVariantForPath(`${getLocalizedRoute("fr", "countries")}?page=2`)
    ).toBe("compact");
  });

  // `usePathname()` returns null before hydration on some routes, and a hero
  // that throws there takes the whole shell down with it.
  // @req REQ-115
  it("falls back to the compact band when there is no path", () => {
    expect(heroVariantForPath("")).toBe("compact");
    expect(heroVariantForPath(null)).toBe("compact");
  });
});

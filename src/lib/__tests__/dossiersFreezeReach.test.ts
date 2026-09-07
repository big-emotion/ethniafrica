import { describe, expect, it } from "vitest";

import { getSiteTree, getSiteTreePaths } from "@/lib/siteTree";
import { getLocalizedRoute, getNommerChapterRoute } from "@/lib/routing";
import { NOMMER_CHAPTER_KEYS } from "@/lib/routing";
import { LOCALES } from "@/lib/locale";
import { LIVE_ROUTES } from "../../../scripts/a11yRoutes";

/**
 * Everywhere the site can still *name* a withdrawn dossier.
 *
 * Making a route answer 404 is the easy half. The half that leaks is the set
 * of surfaces that advertise the address: the sitemap a crawler reads, the
 * site plan a reader browses, the cross-links a fiche offers. Each one left
 * standing publishes a URL that answers 404 — which is worse than never
 * having listed it, because a crawler has to fetch it to find out.
 *
 * Written as one suite over both locales rather than one assertion per
 * surface: the freeze is a single decision, and it either reaches all of them
 * or it has a hole.
 */
const WITHDRAWN_PAGES = ["nommer", "migrations", "colonization"] as const;

describe("no surface advertises a withdrawn dossier", () => {
  for (const language of LOCALES) {
    // @req REQ-110
    it(`keeps the ${language} sitemap free of every withdrawn route`, () => {
      const paths = getSiteTreePaths(language);
      expect(paths.length).toBeGreaterThan(0);

      for (const page of WITHDRAWN_PAGES) {
        expect(paths, page).not.toContain(getLocalizedRoute(language, page));
      }
      for (const key of NOMMER_CHAPTER_KEYS) {
        expect(paths, key).not.toContain(getNommerChapterRoute(language, key));
      }
      expect(
        paths.filter((path) => path.includes("/themes/")),
        "theme pages"
      ).toEqual([]);
    });

    // The plan is the reader's own map of the site. A door drawn on it that
    // opens onto a 404 is the same defect as the sitemap's, one audience over.
    // @req REQ-110
    it(`keeps the ${language} site plan free of every withdrawn route`, () => {
      const listed = getSiteTree(language).flatMap((section) =>
        section.links.map((link) => link.href)
      );

      for (const page of WITHDRAWN_PAGES) {
        expect(listed, page).not.toContain(getLocalizedRoute(language, page));
      }
      for (const key of NOMMER_CHAPTER_KEYS) {
        expect(listed, key).not.toContain(getNommerChapterRoute(language, key));
      }
      expect(
        listed.filter((href) => href.includes("/themes/")),
        "theme pages"
      ).toEqual([]);
    });

    // The hub itself stays listed: Anecdotes lives behind it, so it is a door
    // that still opens. The freeze withdraws readings, not the rubric.
    // @req REQ-110
    it(`keeps the ${language} dossiers hub and the anecdotes listed`, () => {
      const paths = getSiteTreePaths(language);

      expect(paths).toContain(getLocalizedRoute(language, "dossiersHub"));
      expect(paths).toContain(getLocalizedRoute(language, "anecdotes"));
    });
  }

  /**
   * The quality gate's own route list is a surface too, and the one this suite
   * originally missed.
   *
   * `scripts/a11yRoutes.ts` names four dossier routes by hand, and the axe job
   * fails a route on any status >= 400 before it will trust an audit. So the
   * freeze turned a required check red — not because the branch broke
   * accessibility, but because a gate was still asking for pages the branch had
   * withdrawn. It read exactly like the known pre-existing axe failure, which
   * is what makes it worth a test rather than a memory.
   */
  // @req REQ-110
  it("asks the accessibility gate for no withdrawn route", () => {
    expect(LIVE_ROUTES.length).toBeGreaterThan(0);

    for (const language of LOCALES) {
      for (const page of WITHDRAWN_PAGES) {
        expect(LIVE_ROUTES, page).not.toContain(
          getLocalizedRoute(language, page)
        );
      }
      for (const key of NOMMER_CHAPTER_KEYS) {
        expect(LIVE_ROUTES, key).not.toContain(
          getNommerChapterRoute(language, key)
        );
      }
    }
  });

  /**
   * The axis keeps its accessibility coverage through the freeze.
   *
   * The anecdotes, not the hub: `qualityGateRoutes.test.ts` keeps every axis
   * landing page out of both browser gates, and a freeze is not a reason to
   * bend that. What matters here is that withdrawing the readings does not
   * quietly withdraw the whole rubric from the gate.
   */
  // @req REQ-110
  it("keeps auditing the reading the freeze leaves standing", () => {
    for (const language of LOCALES) {
      expect(LIVE_ROUTES).toContain(getLocalizedRoute(language, "anecdotes"));
    }
  });
});

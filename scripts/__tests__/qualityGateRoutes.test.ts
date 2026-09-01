import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { LIVE_ROUTES } from "../a11yRoutes";

const require = createRequire(import.meta.url);
const lighthouseConfig = require("../../.lighthouserc.js");

/**
 * One representative assembled fiche per AFRIK entity type (FR102). Both
 * browser gates must audit all three: a regression that only reaches, say,
 * the country fiche would otherwise pass while two thirds of the fiche
 * surface goes unmeasured.
 */
const REPRESENTATIVE_FICHE_ROUTES = {
  "language-family": getFamilyRoute("fr", "FLG_BANTU"),
  people: getPeopleRoute("fr", "PPL_WOLOF"),
  country: getCountryRoute("fr", "SEN"),
} as const;

/**
 * One representative route per charter route-family rolled out in 16.4–16.9
 * (ETNI-807 · FR110). Both browser gates must audit all five in addition to
 * the three fiche entity-type routes above, or a regression in a whole
 * family (e.g. the search overlay) can ship while the gate stays green.
 * `moderation` uses the public, unauthenticated `/fr/admin/connexion` entry
 * point rather than the auth-gated `/fr/admin` surface: an unauthenticated
 * live audit against a redirect-on-mount page would measure the redirect,
 * not the admin/moderation charter surface.
 */
const REPRESENTATIVE_FAMILY_ROUTES = {
  homepage: "/fr",
  directories: getLocalizedRoute("fr", "peoples"),
  search: getLocalizedRoute("fr", "search"),
  "editorial-legal": "/fr/mentions-legales",
  moderation: "/fr/admin/connexion",
} as const;

/**
 * The axe gate's route list, read as data rather than as text.
 *
 * This used to grep `a11y-test.ts` for quoted route strings, which worked
 * only while the routes were spelled out there. They are composed from the
 * slug table now, so the list lives in its own module and both the gate and
 * this test read the same array — which also means this test can no longer
 * pass by matching a string that happens to appear in a comment.
 */
const axeRoutes = LIVE_ROUTES;

describe("browser quality-gate routes", () => {
  // @req REQ-019
  it("audits canonical AFRIK identifiers instead of display-name slugs", () => {
    expect(lighthouseConfig.ci.collect.url).toContain(
      `http://localhost:3000${getCountryRoute("fr", "SEN")}`
    );
    expect(lighthouseConfig.ci.collect.url).toContain(
      `http://localhost:3000${getPeopleRoute("fr", "PPL_WOLOF")}`
    );
    expect(lighthouseConfig.ci.collect.puppeteerScript).toBe(
      "./scripts/lighthouse-setup.cjs"
    );
    expect(lighthouseConfig.ci.collect.puppeteerLaunchOptions.args).toContain(
      "--no-sandbox"
    );

    expect(axeRoutes).toContain(getPeopleRoute("fr", "PPL_WOLOF"));
    expect(axeRoutes).not.toContain(getPeopleRoute("fr", "wolof"));
  });

  // @req REQ-091
  it("audits one representative fiche route per entity type in both browser gates", () => {
    for (const [entityType, route] of Object.entries(
      REPRESENTATIVE_FICHE_ROUTES
    )) {
      expect(
        lighthouseConfig.ci.collect.url,
        `Lighthouse must audit the ${entityType} fiche`
      ).toContain(`http://localhost:3000${route}`);
      expect(axeRoutes, `axe must audit the ${entityType} fiche`).toContain(
        route
      );
    }
  });

  /**
   * `lhci collect` aborts the whole run on the first URL that fails to load,
   * so one dead address does not cost one measurement — it costs every
   * measurement after it. ETNI-1555 deleted the three axis landing pages
   * while `/fr/explorer` was still first in the list.
   */
  // @req REQ-114
  it("audits no retired axis landing page in either browser gate", () => {
    for (const page of ["explorerHub", "comprendreHub", "jouerHub"] as const) {
      const route = getLocalizedRoute("fr", page);

      expect(lighthouseConfig.ci.collect.url, route).not.toContain(
        `http://localhost:3000${route}`
      );
      expect(axeRoutes, route).not.toContain(route);
    }
  });

  // @req REQ-091
  it("gates every Lighthouse budget at error level so the fiche routes block the build", () => {
    for (const [audit, assertion] of Object.entries(
      lighthouseConfig.ci.assert.assertMatrix[0].assertions
    )) {
      expect(assertion[0], `${audit} must block, not warn`).toBe("error");
    }
  });

  // @req REQ-046
  it("installs a discoverable Chromium binary before running Lighthouse", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/lighthouse.yml"),
      "utf8"
    );

    expect(workflow).toContain("playwright install --with-deps chromium");
    expect(workflow).toContain("CHROME_PATH");
  });

  // @req REQ-046
  it("enforces stable mobile performance and responsiveness budgets", () => {
    const assertions = lighthouseConfig.ci.assert.assertMatrix[0].assertions;

    expect(assertions["categories:performance"]).toEqual([
      "error",
      { minScore: 0.85 },
    ]);
    expect(assertions["largest-contentful-paint"]).toEqual([
      "error",
      { maxNumericValue: 5500 },
    ]);
    expect(assertions["total-blocking-time"]).toEqual([
      "error",
      { maxNumericValue: 300 },
    ]);
  });

  // @req REQ-091
  it("audits one representative route per charter route-family in both browser gates", () => {
    for (const [family, route] of Object.entries(
      REPRESENTATIVE_FAMILY_ROUTES
    )) {
      expect(
        lighthouseConfig.ci.collect.url,
        `Lighthouse must audit the ${family} route-family`
      ).toContain(`http://localhost:3000${route}`);
      expect(axeRoutes, `axe must audit the ${family} route-family`).toContain(
        route
      );
    }
  });

  // @req REQ-103 FR71 (Epic 10, Story 10.11 · ETNI-500)
  it("audits the quiz journey in both browser gates with a blocking mobile Performance gate", () => {
    const quiz = getLocalizedRoute("fr", "quiz");

    expect(
      lighthouseConfig.ci.collect.url,
      `Lighthouse must audit ${quiz}`
    ).toContain(`http://localhost:3000${quiz}`);
    expect(axeRoutes, `axe must audit ${quiz}`).toContain(quiz);

    for (const [audit, assertion] of Object.entries(
      lighthouseConfig.ci.assert.assertMatrix[0].assertions
    )) {
      if (audit === "categories:performance") {
        expect(assertion).toEqual(["error", { minScore: 0.85 }]);
      }
    }
  });
});

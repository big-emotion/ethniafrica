import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const lighthouseConfig = require("../../.lighthouserc.js");

/**
 * One representative assembled fiche per AFRIK entity type (FR102). Both
 * browser gates must audit all three: a regression that only reaches, say,
 * the country fiche would otherwise pass while two thirds of the fiche
 * surface goes unmeasured.
 */
const REPRESENTATIVE_FICHE_ROUTES = {
  "language-family": "/fr/familles/FLG_BANTU",
  people: "/fr/peuples/PPL_WOLOF",
  country: "/fr/pays/SEN",
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
  directories: "/fr/peuples",
  search: "/fr/recherche",
  "editorial-legal": "/fr/mentions-legales",
  moderation: "/fr/admin/connexion",
} as const;

function readAxeScript(): string {
  return readFileSync(resolve(process.cwd(), "scripts/a11y-test.ts"), "utf8");
}

describe("browser quality-gate routes", () => {
  // @req REQ-019
  it("audits canonical AFRIK identifiers instead of display-name slugs", () => {
    expect(lighthouseConfig.ci.collect.url).toContain(
      "http://localhost:3000/fr/pays/SEN"
    );
    expect(lighthouseConfig.ci.collect.url).toContain(
      "http://localhost:3000/fr/peuples/PPL_WOLOF"
    );
    expect(lighthouseConfig.ci.collect.puppeteerScript).toBe(
      "./scripts/lighthouse-setup.cjs"
    );
    expect(lighthouseConfig.ci.collect.puppeteerLaunchOptions.args).toContain(
      "--no-sandbox"
    );

    const axeScript = readAxeScript();
    expect(axeScript).toContain('"/fr/peuples/PPL_WOLOF"');
    expect(axeScript).not.toContain('"/fr/peuples/wolof"');
  });

  // @req REQ-091
  it("audits one representative fiche route per entity type in both browser gates", () => {
    const axeScript = readAxeScript();

    for (const [entityType, route] of Object.entries(
      REPRESENTATIVE_FICHE_ROUTES
    )) {
      expect(
        lighthouseConfig.ci.collect.url,
        `Lighthouse must audit the ${entityType} fiche`
      ).toContain(`http://localhost:3000${route}`);
      expect(axeScript, `axe must audit the ${entityType} fiche`).toContain(
        `"${route}"`
      );
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
    const axeScript = readAxeScript();

    for (const [family, route] of Object.entries(
      REPRESENTATIVE_FAMILY_ROUTES
    )) {
      expect(
        lighthouseConfig.ci.collect.url,
        `Lighthouse must audit the ${family} route-family`
      ).toContain(`http://localhost:3000${route}`);
      expect(axeScript, `axe must audit the ${family} route-family`).toContain(
        `"${route}"`
      );
    }
  });
});

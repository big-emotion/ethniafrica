import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Language } from "@/types/shared";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageFromRoute,
  getLocalizedRoute,
  getPeopleRoute,
  getStaticPageRoute,
  localeSlugMismatch,
  PUBLISHED_LOCALES,
} from "@/lib/routing";
import { getDefaultLocale } from "@/lib/locale";
import { isModulePublished } from "@/lib/hubs/moduleOffer";
import { resolveRelocatedPath, resolveRenamedModulePath } from "@/middleware";
import { LIVE_ROUTES } from "../a11yRoutes";

const require = createRequire(import.meta.url);
const lighthouseConfig = require("../../.lighthouserc.js");

const LIGHTHOUSE_ORIGIN = "http://localhost:3000";
const lighthouseUrls = lighthouseConfig.ci.collect.url as string[];
const lighthouseUrl = (route: string) => `${LIGHTHOUSE_ORIGIN}${route}`;

/**
 * One representative assembled fiche per AFRIK entity type (FR102), in the
 * locale asked for. Both browser gates must audit all three in every
 * published locale: a regression that only reaches, say, the country fiche
 * would otherwise pass while two thirds of the fiche surface goes unmeasured,
 * and a regression that only reaches the English rewrite would pass while
 * half the addresses go unmeasured.
 */
const representativeFicheRoutes = (locale: Language) => ({
  "language-family": getFamilyRoute(locale, "FLG_BANTU"),
  people: getPeopleRoute(locale, "PPL_WOLOF"),
  country: getCountryRoute(locale, "SEN"),
});

/**
 * One representative route per charter route-family rolled out in 16.4–16.9
 * (ETNI-807 · FR110). The axe gate must audit all five in every locale;
 * Lighthouse audits all five in the locale it measures in full (see the
 * English subset below). `moderation` uses the public, unauthenticated
 * sign-in entry point rather than the auth-gated admin surface: an
 * unauthenticated live audit against a redirect-on-mount page would measure
 * the redirect, not the admin/moderation charter surface. The sign-in page
 * is the one admin address that is served in both locales.
 */
const representativeFamilyRoutes = (locale: Language) => ({
  homepage: `/${locale}`,
  directories: getLocalizedRoute(locale, "peoples"),
  search: getLocalizedRoute(locale, "search"),
  "editorial-legal": getStaticPageRoute(locale, "legalNotice"),
  moderation: `${getStaticPageRoute(locale, "admin")}/connexion`,
});

/**
 * The locale Lighthouse measures in full. Bundles are locale-independent, so
 * the second locale is measured on a representative subset rather than a
 * twin of the whole list — a twin doubles a ~16 min nightly for budgets that
 * cannot differ. The full locale is the one whose copy shipped first.
 */
const FULLY_MEASURED_LOCALE: Language = "fr";

/**
 * What the second locale is held to: the home, the three fiches, one facet,
 * the quiz, the migrations atlas, the doctrine index, the comparator picker
 * and the glossary. Composed from the slug table here and spelled out in
 * `.lighthouserc.js`, which is what pins the spelled-out copy.
 */
const representativeSubset = (locale: Language) => [
  `/${locale}`,
  ...Object.values(representativeFicheRoutes(locale)),
  getLocalizedRoute(locale, "peoples"),
  getLocalizedRoute(locale, "quiz"),
  // One reading off the dossiers axis, whichever one is published. The subset
  // exists so no axis goes unmeasured, and naming `migrations` outright made
  // that guarantee lapse the moment the module was withdrawn — `lhci collect`
  // aborts on the first URL that fails to load, so the dead address would have
  // cost every measurement after it rather than its own.
  isModulePublished("frise")
    ? getLocalizedRoute(locale, "migrations")
    : getLocalizedRoute(locale, "anecdotes"),
  getLocalizedRoute(locale, "doctrine"),
  getLocalizedRoute(locale, "compare"),
  getLocalizedRoute(locale, "glossary"),
];

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

const tighterBudgetPatterns = (
  lighthouseConfig.ci.assert.assertMatrix as {
    matchingUrlPattern: string;
  }[]
)
  .slice(1)
  .map((entry) => new RegExp(entry.matchingUrlPattern));

describe("browser quality-gate routes", () => {
  // @req REQ-019
  it("audits canonical AFRIK identifiers instead of display-name slugs", () => {
    expect(lighthouseUrls).toContain(
      lighthouseUrl(getCountryRoute("fr", "SEN"))
    );
    expect(lighthouseUrls).toContain(
      lighthouseUrl(getPeopleRoute("fr", "PPL_WOLOF"))
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

  // @req REQ-141
  it("audits one representative fiche route per entity type, in every locale, in both browser gates", () => {
    for (const locale of PUBLISHED_LOCALES) {
      for (const [entityType, route] of Object.entries(
        representativeFicheRoutes(locale)
      )) {
        expect(
          lighthouseUrls,
          `Lighthouse must audit the ${locale} ${entityType} fiche`
        ).toContain(lighthouseUrl(route));
        expect(
          axeRoutes,
          `axe must audit the ${locale} ${entityType} fiche`
        ).toContain(route);
      }
    }
  });

  /**
   * `lhci collect` aborts the whole run on the first URL that fails to load,
   * so one dead address does not cost one measurement — it costs every
   * measurement after it. ETNI-1555 deleted the three axis landing pages
   * while `/fr/atlas` was still first in the list.
   */
  // @req REQ-114
  it("audits no retired axis landing page in either browser gate, in any locale", () => {
    for (const locale of PUBLISHED_LOCALES) {
      for (const page of ["atlasHub", "dossiersHub", "jeuxHub"] as const) {
        const route = getLocalizedRoute(locale, page);

        expect(lighthouseUrls, route).not.toContain(lighthouseUrl(route));
        expect(axeRoutes, route).not.toContain(route);
      }
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

  /**
   * The PR comment used to carry its own hand-typed route list, which listed
   * four retired addresses and called a route "not audited" that the config
   * had measured for months. A list that is read off the config cannot say
   * something the config does not.
   */
  // @req REQ-046
  it("derives the PR comment's route list from the Lighthouse config", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/lighthouse.yml"),
      "utf8"
    );

    expect(workflow).toContain("require('./.lighthouserc.js')");
    const handTypedRoutes = workflow
      .split("\n")
      .filter((line) => /- `\/fr/.test(line));
    expect(handTypedRoutes).toEqual([]);
    expect(workflow).not.toContain("Not audited");
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

  // @req REQ-141
  it("audits one representative route per charter route-family in every locale with axe", () => {
    for (const locale of PUBLISHED_LOCALES) {
      for (const [family, route] of Object.entries(
        representativeFamilyRoutes(locale)
      )) {
        expect(
          axeRoutes,
          `axe must audit the ${locale} ${family} route-family`
        ).toContain(route);
      }
    }
  });

  // @req REQ-091
  it("audits one representative route per charter route-family with Lighthouse in the fully measured locale", () => {
    for (const [family, route] of Object.entries(
      representativeFamilyRoutes(FULLY_MEASURED_LOCALE)
    )) {
      expect(
        lighthouseUrls,
        `Lighthouse must audit the ${family} route-family`
      ).toContain(lighthouseUrl(route));
    }
  });

  /**
   * `.lighthouserc.js` cannot import the slug table (CommonJS, loaded by the
   * lhci CLI), so its English addresses are spelled out. This is what keeps
   * them honest: every one of them must equal what the helpers compose, and
   * every locale must be held to at least the subset.
   */
  // @req REQ-141
  it("measures every published locale on at least the representative subset", () => {
    for (const locale of PUBLISHED_LOCALES) {
      for (const route of representativeSubset(locale)) {
        expect(lighthouseUrls, `Lighthouse must audit ${route}`).toContain(
          lighthouseUrl(route)
        );
      }
    }
  });

  /**
   * The root URL is measured through the middleware's redirect, so its budget
   * is attributed to whichever locale is the default (REQ-140). The config
   * must say so where the inclusion decisions are written, or the day the
   * default changes the budget silently moves and nobody reads it as a move.
   */
  // @req REQ-140
  it("measures the root and records which locale it lands on", () => {
    expect(lighthouseUrls).toContain(`${LIGHTHOUSE_ORIGIN}/`);
    expect(lighthouseUrls).toContain(lighthouseUrl(`/${getDefaultLocale()}`));

    const config = readFileSync(
      resolve(process.cwd(), ".lighthouserc.js"),
      "utf8"
    );
    expect(config).toContain("REQ-140");
  });

  /**
   * The property the named lists above cannot state: that a URL nobody
   * thought to list is still an address the site serves.
   *
   * `.lighthouserc.js` spells its routes out, while `a11yRoutes.ts`
   * recomposes them from the slug table -- so the two drift apart exactly
   * when a slug moves, and only the hand-written one goes stale. Moving
   * Appellations from Comprendre to Explorer left this file auditing
   * `/fr/dossiers/appellations`, and every assertion here passed, because
   * appellations belongs to none of the families enumerated above.
   *
   * Asked through the middleware's own resolvers rather than against a
   * second copy of the slug table: a collect URL that the middleware would
   * answer with a 308 is by definition an address that has moved. Lighthouse
   * would still measure it -- it follows the redirect -- so the budget is
   * silently attributed to a route the config no longer names, and `lhci`
   * has one more hop to abort on. The locale check is the same question one
   * locale later: `/en/atlas/pays` is served, at `/en/atlas/countries`.
   */
  // @req REQ-091
  it("audits no address the middleware would redirect", () => {
    for (const url of lighthouseUrls) {
      const { pathname, searchParams } = new URL(url);

      expect(
        resolveRelocatedPath(pathname, searchParams),
        `${url} has moved (relocated segment)`
      ).toBeNull();
      expect(
        resolveRenamedModulePath(pathname),
        `${url} has moved (renamed module path)`
      ).toBeNull();
      expect(
        localeSlugMismatch(pathname),
        `${url} is written in the other locale's vocabulary`
      ).toBeNull();
      if (pathname !== "/") {
        expect(
          getLanguageFromRoute(pathname),
          `${url} opens on a locale the site does not publish`
        ).not.toBeNull();
      }
    }
  });

  /**
   * The assertMatrix scopes its tighter budgets by URL pattern. A pattern
   * that names one locale's slug holds the other locale's comparator to the
   * looser site-wide budget in silence — which is how the English subset
   * could ship with the comparator's field-metric gate unarmed.
   */
  // @req REQ-141
  it("gives every locale's comparator and migrations route the tighter assertMatrix budgets", () => {
    for (const locale of PUBLISHED_LOCALES) {
      for (const page of ["compare", "migrations"] as const) {
        const route = getLocalizedRoute(locale, page);
        const matched = tighterBudgetPatterns.filter(
          (pattern) =>
            pattern.test(lighthouseUrl(route)) &&
            pattern.test(lighthouseUrl(`${route}/peuples/PPL_A/PPL_B`))
        );

        expect(
          matched,
          `${route} and its sub-routes must fall under a tighter budget`
        ).toHaveLength(1);
      }
    }
  });

  /**
   * The parity the bilingual doctrine asks of the corpus (REQ-145), asked of
   * the gate: what axe audits in one locale it audits in the other, route for
   * route. A locale that is only spot-checked would pass this suite's named
   * lists and still leave most of its surface unmeasured.
   */
  // @req REQ-145
  it("audits the same routes in every locale with axe, each under its own prefix", () => {
    const perLocale = PUBLISHED_LOCALES.map((locale) =>
      axeRoutes.filter(
        (route) => route === `/${locale}` || route.startsWith(`/${locale}/`)
      )
    );

    expect(perLocale.flat()).toHaveLength(axeRoutes.length);
    for (const routes of perLocale) {
      expect(routes).toHaveLength(perLocale[0].length);
    }
    // Sixteen per locale while the dossiers are withdrawn; twenty when they
    // return. The number is the wall clock of the one required check, and it
    // is written out rather than derived so that adding a route is a decision
    // taken here — a count computed from the list under test would agree with
    // whatever that list happened to say.
    const perLocaleRoutes =
      16 +
      (isModulePublished("nommer") ? 2 : 0) +
      (isModulePublished("frise") ? 1 : 0) +
      (isModulePublished("regards-colonisation") ? 1 : 0);

    expect(axeRoutes.length).toBe(perLocaleRoutes * PUBLISHED_LOCALES.length);
  });

  // @req REQ-103 FR71 (Epic 10, Story 10.11 · ETNI-500)
  it("audits the quiz journey in both browser gates with a blocking mobile Performance gate", () => {
    for (const locale of PUBLISHED_LOCALES) {
      const quiz = getLocalizedRoute(locale, "quiz");

      expect(lighthouseUrls, `Lighthouse must audit ${quiz}`).toContain(
        lighthouseUrl(quiz)
      );
      expect(axeRoutes, `axe must audit ${quiz}`).toContain(quiz);
    }

    for (const [audit, assertion] of Object.entries(
      lighthouseConfig.ci.assert.assertMatrix[0].assertions
    )) {
      if (audit === "categories:performance") {
        expect(assertion).toEqual(["error", { minScore: 0.85 }]);
      }
    }
  });

  // The public deployment deliberately defaults to fr-only during rollout.
  // Browser gates must opt into both locales themselves or every English URL
  // is only measuring the French redirect target.
  // @req REQ-141
  it("publishes both locales inside every bilingual browser gate", () => {
    for (const workflowPath of [
      ".github/workflows/a11y.yml",
      ".github/workflows/e2e.yml",
      ".github/workflows/lighthouse.yml",
    ]) {
      const workflow = readFileSync(
        resolve(process.cwd(), workflowPath),
        "utf8"
      );
      expect(workflow, workflowPath).toContain(
        "SITE_LOCALE_MODE: bilingual-fr-default"
      );
    }
  });
});

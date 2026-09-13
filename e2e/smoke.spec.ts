import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/fixtures";
import {
  getCountryRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { LOCALE } from "./support/locale";

/**
 * The smoke set: the check a pull request into `recette` is required to pass.
 *
 * Four routes a reader actually lands on — the home, a country fiche, a
 * people fiche and the search page — each asked two questions a built server
 * can answer in seconds: does it render its own title, and does axe find
 * nothing serious or critical on it. The full matrix (every viewport, both
 * locales, the journeys) stays nightly and on the promotion into `main`,
 * where a slow or data-shaped failure can be read without blocking a merge.
 *
 * French only and 430px only, like the rest of the suite's source of truth.
 * The routes are composed through the slug table, never written out.
 */
test.skip(
  LOCALE !== "fr",
  "The smoke set is the French, 430px source of truth"
);

const SMOKE_ROUTES = [
  { name: "home", path: `/${LOCALE}` },
  { name: "country fiche SEN", path: getCountryRoute(LOCALE, "SEN") },
  { name: "people fiche PPL_WOLOF", path: getPeopleRoute(LOCALE, "PPL_WOLOF") },
  { name: "search", path: getLocalizedRoute(LOCALE, "search") },
] as const;

// @req REQ-091
test.describe("@smoke reading surfaces render and pass axe", () => {
  for (const route of SMOKE_ROUTES) {
    // @req REQ-091
    test(`@smoke ${route.name} renders its title with no serious or critical axe violation`, async ({
      page,
    }) => {
      const response = await page.goto(route.path);
      expect(response?.status(), route.path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical"
      );

      expect(
        blocking,
        blocking
          .map(
            (violation) =>
              `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`
          )
          .join("\n")
      ).toEqual([]);
    });
  }
});

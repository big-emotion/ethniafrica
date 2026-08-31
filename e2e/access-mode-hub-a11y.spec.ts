import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./support/fixtures";
import { getLocalizedRoute } from "@/lib/routing";

// REQ-114 AC4 — axe-core zero serious/critical, on each of the three
// access-mode hub routes, at the three reference widths (430, 720,
// 1200 px). @cross-viewport runs this on mobile-430 (default, source of
// truth), tablet-720 and desktop-1200 (playwright.config.ts), matching the
// pattern in e2e/family-tree-a11y.spec.ts.
const HUB_ROUTES = [
  { mode: "explorer", url: getLocalizedRoute("fr", "explorerHub") },
  { mode: "comprendre", url: getLocalizedRoute("fr", "comprendreHub") },
  { mode: "jouer", url: getLocalizedRoute("fr", "jouerHub") },
];

// @req REQ-114
test.describe("@nfr-a11y @cross-viewport access-mode hubs — axe-core", () => {
  for (const { mode, url } of HUB_ROUTES) {
    // @req REQ-114
    test(`has zero serious/critical violations on the ${mode} hub`, async ({
      page,
    }) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );

      expect(
        blocking,
        blocking
          .map(
            (v) =>
              `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`
          )
          .join("\n")
      ).toEqual([]);
    });
  }
});

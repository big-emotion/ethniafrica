import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./support/fixtures";
import { getLocalizedRoute } from "@/lib/routing";

// REQ-114 AC4 — axe-core zero serious/critical on the entry point of each of
// the three access modes, at the three reference widths (430, 720, 1200 px).
// @cross-viewport runs this on mobile-430 (default, source of truth),
// tablet-720 and desktop-1200 (playwright.config.ts), matching the pattern in
// e2e/family-tree-a11y.spec.ts.
//
// It used to audit the three axis landing pages. ETNI-1555 deleted them: the
// reader picks a module, so the first page an access mode actually lands on
// is one of its modules. `scripts/a11yRoutes.ts` audits these same three
// addresses at one width; the cross-viewport sweep is what this file adds.
const ENTRY_ROUTES = [
  { mode: "explorer", url: getLocalizedRoute("fr", "peoples") },
  { mode: "comprendre", url: getLocalizedRoute("fr", "names") },
  { mode: "jouer", url: getLocalizedRoute("fr", "quiz") },
];

// @req REQ-114
test.describe("@nfr-a11y @cross-viewport access-mode entry points — axe-core", () => {
  for (const { mode, url } of ENTRY_ROUTES) {
    // @req REQ-114
    test(`has zero serious/critical violations entering ${mode}`, async ({
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

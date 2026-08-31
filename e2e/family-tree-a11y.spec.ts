import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./support/fixtures";
import { getFamilyRoute } from "@/lib/routing";

// ETNI-463 (7.11) AC2 — axe-core zero serious/critical, blocking, on the
// large-family sample route. FLG_BANTU is the largest family with real
// seeded data (6 languages, 174 associated peoples) — same sample as the
// Lighthouse gate (.lighthouserc.js) and the tree-skeleton size budget
// (languageFamilyTreeRoutes.test.ts). Runs on the mobile-430 project (the
// source-of-truth viewport per playwright.config.ts) with no
// continue-on-error in e2e.yml, so a violation here fails the required CI
// check — unlike the Storybook-only axe pass in a11y.yml, which currently
// tolerates "serious" impact.
const LARGE_FAMILY_SAMPLE_URL = getFamilyRoute("fr", "FLG_BANTU");

// @req REQ-047
test.describe("@nfr-a11y family classification tree — axe-core", () => {
  // @req REQ-047
  test("has zero serious/critical violations on the large-family sample", async ({
    page,
  }) => {
    await page.goto(LARGE_FAMILY_SAMPLE_URL);
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
});

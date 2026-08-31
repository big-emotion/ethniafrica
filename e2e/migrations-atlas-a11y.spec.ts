import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./support/fixtures";
import { getLocalizedRoute } from "@/lib/routing";

// ETNI-523 (12.10) AC1 — axe-core zero serious/critical on /fr/migrations
// across its three distinct states: the default Récit tab, the Carte tab
// (map + scrubber + list), and the sheet-open state (MigrationDetailSheet).
// Runs on the mobile-430 project (source-of-truth viewport per
// playwright.config.ts) with no continue-on-error in e2e.yml, so a
// violation here fails the required CI check — the static Storybook/live
// audit in a11y.yml only covers the server-rendered Récit-default markup
// (scripts/a11y-test.ts), not these interactive states.
const MIGRATIONS_URL = getLocalizedRoute("fr", "migrations");

async function expectNoSeriousOrCriticalViolations(
  page: import("@playwright/test").Page
) {
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
}

// @req REQ-101 FR84
test.describe("@nfr-a11y migrations atlas — axe-core", () => {
  // @req REQ-101 FR84
  test("has zero serious/critical violations on the default Récit tab", async ({
    page,
  }) => {
    await page.goto(MIGRATIONS_URL);
    await page.waitForLoadState("networkidle");

    await expectNoSeriousOrCriticalViolations(page);
  });

  // @req REQ-101 FR84 FR78
  test("has zero serious/critical violations on the Carte tab", async ({
    page,
  }) => {
    await page.goto(MIGRATIONS_URL);
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Carte" }).click();
    await expect(page.getByTestId("time-scrubber")).toBeVisible();

    await expectNoSeriousOrCriticalViolations(page);
  });

  // @req REQ-101 FR84 FR78
  test("has zero serious/critical violations with the detail sheet open", async ({
    page,
  }) => {
    await page.goto(MIGRATIONS_URL);
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Carte" }).click();
    const firstListItem = page
      .locator('[data-testid^="migration-list-item-"]')
      .first();
    await expect(firstListItem).toBeVisible();
    await firstListItem.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    await expectNoSeriousOrCriticalViolations(page);
  });
});

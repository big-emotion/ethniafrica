import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./support/fixtures";
import { getLocalizedRoute } from "@/lib/routing";
import { isModulePublished } from "@/lib/hubs/moduleOffer";
import { LOCALE } from "./support/locale";

// English UI copy lands per translation wave (REQ-142 to REQ-146). Until it
// does, the labels this spec reads are French, so the English matrix leg
// skips it rather than fail on copy it was never asked to check — and the
// leg's report says so, instead of counting the journey as covered.
test.skip(
  LOCALE !== "fr",
  "English copy lands per wave — this spec reads French UI copy"
);

// The route calls `notFound()` while the registry declares `frise` a draft,
// so there is no atlas to drive. Asked of the same declaration the route
// reads: publishing the module re-arms this spec with no edit here.
test.skip(
  !isModulePublished("frise"),
  "The migrations atlas is withdrawn (moduleRegistry: frise is a draft), so its route answers 404"
);

// ETNI-523 (12.10) AC1 — axe-core zero serious/critical on the migrations atlas route
// across its three distinct states: the default Récit tab, the Carte tab
// (map + scrubber + list), and the sheet-open state (MigrationDetailSheet).
// Runs on the mobile-430 project (source-of-truth viewport per
// playwright.config.ts) with no continue-on-error in e2e.yml, so a
// violation here fails the required CI check — the static Storybook/live
// audit in a11y.yml only covers the server-rendered Récit-default markup
// (scripts/a11y-test.ts), not these interactive states.
const MIGRATIONS_URL = getLocalizedRoute(LOCALE, "migrations");

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

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/fixtures";

/**
 * Accessibility gate for the family fiche at the globe (REQ-116).
 *
 * FLG_BENOUECONGO is the sample the mockup itself uses: 60 member peoples over
 * 17 derived countries, which is the largest country picker the page can
 * produce and therefore the hardest listbox to get right.
 *
 * The panel is checked both closed and open. A facts panel that only passes
 * while it is closed passes nothing — it is the open state that introduces the
 * live region, the focus move and the dialog-adjacent semantics.
 */
const FAMILY_URL = "/fr/familles/FLG_BENOUECONGO";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

function blockingViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]
) {
  return violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
}

function report(violations: ReturnType<typeof blockingViolations>) {
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`
    )
    .join("\n");
}

test.describe("@nfr-a11y family fiche at the globe — axe-core", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FAMILY_URL);
    await page.waitForLoadState("networkidle");
  });

  // @req REQ-116
  test("has zero serious/critical violations at rest", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    const blocking = blockingViolations(results.violations);
    expect(blocking, report(blocking)).toEqual([]);
  });

  // @req REQ-116
  test("has zero serious/critical violations with the facts panel open", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /pays de l'empreinte/i }).click();
    await page.getByRole("option").first().click();
    await expect(page.getByRole("complementary")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    const blocking = blockingViolations(results.violations);
    expect(blocking, report(blocking)).toEqual([]);
  });
});

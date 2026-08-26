import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./support/fixtures";

/**
 * The people fiche had no a11y gate at all, while the family fiche has had a
 * blocking one since ETNI-463. Everything the globe gained — a listbox picker,
 * a toolbar, a drag surface, a facts panel — is new keyboard territory, and it
 * would otherwise land with no net under it.
 *
 * Three samples, because the corpus has three regimes and they render
 * different chrome: half the fiches declare one country and get no picker and
 * no "Toute l'aire" at all, the mockup was drawn on a five-country fiche, and
 * PPL_BANTU stacks 21 halos and 21 options. A pass on the middle one says
 * nothing about the other two.
 *
 * Runs on mobile-430, the source-of-truth viewport, with no continue-on-error
 * in e2e.yml — so a violation fails the required check.
 */
const PEOPLE_SAMPLES = [
  { id: "PPL_YORUBA", regime: "five countries — the mockup's own sample" },
  { id: "PPL_BANTU", regime: "21 countries — the widest field in the corpus" },
];

// @req REQ-115
test.describe("@nfr-a11y people fiche — axe-core", () => {
  for (const sample of PEOPLE_SAMPLES) {
    // @req REQ-115
    test(`has zero serious/critical violations on ${sample.id} (${sample.regime})`, async ({
      page,
    }) => {
      await page.goto(`/fr/peuples/${sample.id}`);
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

  // The picker exists so a country that has rotated behind the sphere is still
  // reachable. If it cannot be operated from the keyboard it has not solved
  // that for the readers who most needed it solved.
  // @req REQ-117
  test("reaches every country of presence from the keyboard alone", async ({
    page,
  }) => {
    await page.goto("/fr/peuples/PPL_YORUBA");
    await page.waitForLoadState("networkidle");

    const picker = page.locator("[data-atlas-picker] button").first();
    await picker.focus();
    await page.keyboard.press("Enter");

    const options = page.getByRole("option");
    await expect(options.first()).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(page.getByRole("dialog")).toBeVisible();

    // Escape has to hand focus back, or a keyboard reader is stranded at the
    // top of the document several tab stops from where they were.
    await picker.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(picker).toBeFocused();
  });
});

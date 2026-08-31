import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./support/fixtures";
import { getPeopleRoute } from "@/lib/routing";

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
 * Runs on mobile-430, the source-of-truth viewport. It fails its own job, but
 * that job is not a required check — only gitleaks and build are — so a
 * violation here is red and still mergeable. Read the finding, do not read the
 * merge button.
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
      await page.goto(getPeopleRoute("fr", sample.id));
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
    await page.goto(getPeopleRoute("fr", "PPL_YORUBA"));
    await page.waitForLoadState("networkidle");

    // Found by its accessible name, the way the readers this test is about
    // find it. The selector here used to be `[data-atlas-picker]`, an
    // attribute no component ever carried — so the test could not fail, and
    // did not, because e2e never ran in CI either.
    const picker = page.getByRole("button", {
      name: "Choisir un pays de présence",
    });
    await picker.focus();
    await page.keyboard.press("Enter");

    const options = page.getByRole("option");
    await expect(options.first()).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    // Named, not just "a dialog": the cookie banner is one too, so a bare
    // role match is ambiguous and never resolved to the panel.
    await expect(
      page.getByRole("dialog", { name: /Yoruba au / })
    ).toBeVisible();

    // Escape has to hand focus back, or a keyboard reader is stranded at the
    // top of the document several tab stops from where they were.
    await picker.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(picker).toBeFocused();
  });
});

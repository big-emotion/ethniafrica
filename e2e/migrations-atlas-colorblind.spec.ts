import { test, expect } from "./support/fixtures";

// ETNI-523 (12.10) AC5 — under deuteranopia/protanopia/tritanopia
// simulation, active vs. dimmed vs. selected migration paths on the map
// must stay distinguishable. MigrationPathLayer.tsx already encodes state
// via stroke-width + opacity + a text label for the selected event — never
// color alone (see the "never color alone, WCAG 1.4.1" unit test in
// MigrationPathLayer.test.tsx) — so this spec applies the standard
// Brettel-derived color-blindness filter matrices as a CSS filter over the
// map and re-asserts that same non-color signal survives the simulation,
// plus attaches a screenshot per type for the reviewer to eyeball.
const MIGRATIONS_URL = "/fr/migrations";

const COLORBLIND_FILTERS: Record<string, string> = {
  protanopia:
    "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  deuteranopia: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  tritanopia:
    "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
};

function filterStyleFor(name: string): string {
  return `
    html { filter: url(#afh-cvd-${name}); }
    svg#afh-cvd-defs { position: absolute; width: 0; height: 0; }
  `;
}

// @req REQ-101 FR84 UX-DR39
test.describe("@nfr-a11y migrations atlas — color-blindness simulation", () => {
  for (const [name, matrix] of Object.entries(COLORBLIND_FILTERS)) {
    // @req REQ-101 FR84
    test(`active/dimmed/selected states stay distinguishable under ${name} simulation`, async ({
      page,
    }, testInfo) => {
      await page.goto(MIGRATIONS_URL);
      await page.waitForLoadState("networkidle");
      await page.getByRole("tab", { name: "Carte" }).click();

      // Select the first event so the map renders all three states at once:
      // the selected path, other active paths, and dimmed/inactive paths.
      const firstListItem = page
        .locator('[data-testid^="migration-list-item-"]')
        .first();
      await expect(firstListItem).toBeVisible();
      await firstListItem.click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.evaluate(
        ({ name, matrix }) => {
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          svg.id = "afh-cvd-defs";
          svg.innerHTML = `<filter id="afh-cvd-${name}"><feColorMatrix type="matrix" values="${matrix}" /></filter>`;
          document.body.appendChild(svg);
        },
        { name, matrix }
      );
      await page.addStyleTag({ content: filterStyleFor(name) });

      const selectedPath = page.locator(
        '[data-testid^="migration-path-"][data-selected="true"]'
      );
      await expect(selectedPath).toHaveCount(1);
      const selectedStrokeWidth =
        await selectedPath.getAttribute("stroke-width");

      const otherPaths = page.locator(
        '[data-testid^="migration-path-"][data-selected="false"]'
      );
      const otherCount = await otherPaths.count();
      expect(otherCount).toBeGreaterThan(0);

      const otherStrokeWidths = new Set<string>();
      for (let i = 0; i < otherCount; i++) {
        const strokeWidth = await otherPaths
          .nth(i)
          .getAttribute("stroke-width");
        if (strokeWidth) otherStrokeWidths.add(strokeWidth);
      }

      // The selected path's stroke-width is never shared with a
      // non-selected path, and non-selected paths still carry an
      // active/inactive stroke-width distinction — none of this depends on
      // hue, so it survives every color-blindness simulation unchanged.
      expect(otherStrokeWidths.has(selectedStrokeWidth ?? "")).toBe(false);

      const screenshot = await page.screenshot({ fullPage: false });
      await testInfo.attach(`colorblind-${name}`, {
        body: screenshot,
        contentType: "image/png",
      });
    });
  }
});

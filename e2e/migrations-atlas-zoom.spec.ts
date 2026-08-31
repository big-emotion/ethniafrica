import { test, expect } from "./support/fixtures";
import { getLocalizedRoute } from "@/lib/routing";

// ETNI-523 (12.10) AC3 — 200% text zoom at the three reference viewports
// (430/720/800 px, playwright.config.ts) must not introduce horizontal
// scroll on the body or clip content (UX-DR39). `@cross-viewport` runs this
// on all three projects (mobile-430, tablet-720, desktop-800); the default
// grep only runs mobile-430 (e2e/README.md).
//
// Browser "page zoom" isn't exposed through Playwright's API, so this
// simulates WCAG 1.4.4 text-resize the same way real browser zoom affects
// layout for rem/em-based type: scaling the root font-size 200%, which is
// the standard technique for testing reflow at zoom (WCAG 1.4.10 companion
// check for 1.4.4).
const MIGRATIONS_URL = getLocalizedRoute("fr", "migrations");
const TEXT_ZOOM_STYLE = "html { font-size: 200% !important; }";

// @req REQ-101 FR84 UX-DR39
test.describe("@cross-viewport migrations atlas — 200% text zoom reflow", () => {
  // @req REQ-101 UX-DR39
  test("no horizontal scroll and no clipped content at 200% text zoom", async ({
    page,
  }) => {
    await page.goto(MIGRATIONS_URL);
    await page.waitForLoadState("networkidle");
    await page.addStyleTag({ content: TEXT_ZOOM_STYLE });

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.getByRole("tab", { name: "Carte" }).click();
    const { scrollWidth: carteScrollWidth, clientWidth: carteClientWidth } =
      await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
    expect(carteScrollWidth).toBeLessThanOrEqual(carteClientWidth);

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const tabsList = page.getByRole("tablist");
    const tabsBox = await tabsList.boundingBox();
    expect(tabsBox).not.toBeNull();
    // Clipped content: any part of the tablist rendered outside the
    // viewport horizontally.
    if (tabsBox) {
      expect(tabsBox.x).toBeGreaterThanOrEqual(0);
      expect(tabsBox.x + tabsBox.width).toBeLessThanOrEqual(viewportWidth);
    }
  });
});

import { expect, test } from "@playwright/test";

const referenceViewports = [
  {
    name: "home-hero-mobile-390.png",
    width: 390,
    height: 844,
    maxDiffPixelRatio: 0.19,
  },
  {
    name: "home-hero-tablet-720.png",
    width: 720,
    height: 1024,
    maxDiffPixelRatio: 0.21,
  },
  {
    name: "home-hero-desktop-1440.png",
    width: 1440,
    height: 900,
    maxDiffPixelRatio: 0.31,
  },
] as const;

test.describe("Home visual parity", () => {
  for (const reference of referenceViewports) {
    // @req REQ-091
    test(`matches ${reference.width}px reference`, async ({ page }) => {
      await page.setViewportSize(reference);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/fr");

      const acceptCookies = page.getByRole("button", { name: "Accepter tout" });
      if (await acceptCookies.isVisible()) {
        await acceptCookies.click();
      }
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      await expect(page).toHaveScreenshot(reference.name, {
        animations: "disabled",
        caret: "hide",
        // The reference is the prototype: its module tab bar, demo lede, and
        // next-module preview are intentionally replaced by the live app nav,
        // home copy, and access-mode hubs (Epic 14 adaptation).
        maxDiffPixelRatio: reference.maxDiffPixelRatio,
      });
    });
  }
});

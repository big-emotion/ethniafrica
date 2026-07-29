import { expect, test } from "@playwright/test";
import { PRODUCT_NAME } from "@/lib/brand";

// The full-page prototype captures include the prototype's own module tab
// bar and next-module preview, which the live app intentionally replaces
// with its site nav and access-mode hubs (Epic 14 adaptation) — diffing
// full pages therefore mixes real hero parity with known, unrelated
// substitutions and can't substantiate "composition, colours, type
// hierarchy, dot field match" for the hero itself (ETNI-543 review round 2).
//
// Each `*-region.png` file below is a mechanical crop of the corresponding
// PO-approved full-page reference — no new content, same pixels — isolating
// the hero region so the comparison actually constrains what AC1 describes.
// Regenerate with (crop = the live HomeHero section's own measured
// boundingBox at that viewport):
//   sharp(`<viewport>.png`).extract({ left: 0, top, width, height }).toFile(`<viewport>-region.png`)
//   mobile-390:  top 96,  585x390    tablet-720: top 96,  526x720
//   desktop-1440: top 112, 465x1440
const referenceViewports = [
  {
    name: "home-hero-mobile-390-region.png",
    width: 390,
    height: 844,
    clipY: 96,
    clipHeight: 585,
    // Measured baseline (cookie-banner-race-fixed): ratio 0.09.
    maxDiffPixelRatio: 0.11,
  },
  {
    name: "home-hero-tablet-720-region.png",
    width: 720,
    height: 1024,
    clipY: 96,
    clipHeight: 526,
    // Measured baseline: ratio 0.12.
    maxDiffPixelRatio: 0.14,
  },
  {
    name: "home-hero-desktop-1440-region.png",
    width: 1440,
    height: 900,
    clipY: 112,
    clipHeight: 465,
    // Measured baseline: ratio 0.07.
    maxDiffPixelRatio: 0.09,
  },
] as const;

test.describe("Home visual parity", () => {
  for (const reference of referenceViewports) {
    // @req REQ-091
    test(`matches ${reference.width}px reference`, async ({ page }) => {
      await page.setViewportSize(reference);
      await page.emulateMedia({ reducedMotion: "reduce" });
      // Pre-seed consent so the cookie banner never mounts. It renders
      // asynchronously after a localStorage check (useConsent), so a
      // post-navigation isVisible()/click race could leave it open and
      // occluding the screenshot — pre-seeding removes that race entirely.
      await page.addInitScript(
        ([key, value]) => window.localStorage.setItem(key, value),
        [
          "ethni-consent",
          JSON.stringify({
            hasConsented: true,
            preferences: { essential: true, analytics: true, functional: true },
            consentDate: new Date().toISOString(),
          }),
        ]
      );
      await page.goto("/fr");

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Anchor the clip to the live HomeHero section's own measured top so
      // the crop tracks the real render (nav height, font metrics) instead
      // of a hardcoded guess; the height stays fixed to match the region
      // reference's dimensions exactly (toHaveScreenshot requires identical
      // image sizes to compute a diff ratio at all).
      const heroBox = await page
        .locator(`section[aria-label="${PRODUCT_NAME}"]`)
        .boundingBox();
      const clipY = heroBox ? Math.round(heroBox.y) : reference.clipY;

      await expect(page).toHaveScreenshot(reference.name, {
        animations: "disabled",
        caret: "hide",
        clip: {
          x: 0,
          y: clipY,
          width: reference.width,
          height: reference.clipHeight,
        },
        maxDiffPixelRatio: reference.maxDiffPixelRatio,
      });
    });
  }
});

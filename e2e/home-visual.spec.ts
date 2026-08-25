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
//
// REQ-115 (ETNI-1278/1282): the hero is no longer a fixed ~350px band, so
// the crop can no longer use a hardcoded height — the copy-then-globe-stage
// composition's total height varies by breakpoint (it grows to fill the
// viewport at >=1200px, see HomeHero.tsx's .home-hero media query). Both
// clipY and clipHeight below are therefore measured live from the section's
// own boundingBox each run (see the test body); the `clipY`/`clipHeight`
// fields here are only the fallback used if that measurement fails.
// Regenerate the committed references with:
//   npx playwright test e2e/home-visual.spec.ts --update-snapshots
const referenceViewports = [
  {
    name: "home-hero-mobile-390-region.png",
    width: 390,
    height: 844,
    clipY: 58,
    clipHeight: 674,
    // Carried over from the pre-REQ-115 baseline; not re-measured against
    // CI's runner fonts from this environment.
    maxDiffPixelRatio: 0.11,
  },
  {
    name: "home-hero-tablet-720-region.png",
    width: 720,
    height: 1024,
    clipY: 58,
    clipHeight: 799,
    // Carried over from the pre-REQ-115 baseline; not re-measured against
    // CI's runner fonts from this environment.
    maxDiffPixelRatio: 0.14,
  },
  {
    name: "home-hero-desktop-1440-region.png",
    width: 1440,
    height: 900,
    clipY: 57,
    clipHeight: 900,
    // Carried over from the pre-REQ-115 baseline; not re-measured against
    // CI's runner fonts from this environment.
    maxDiffPixelRatio: 0.09,
  },
] as const;

test.describe("Home visual parity", () => {
  // The committed *-region.png references were captured at
  // deviceScaleFactor 1 with no mobile/touch emulation (their pixel
  // dimensions match their CSS viewport widths exactly — e.g. the 720px
  // reference is exactly 720px wide). In CI, this spec's only tag-free
  // project match is "mobile-430" (deviceScaleFactor 2.625, isMobile,
  // hasTouch — see playwright.config.ts), so without this override every
  // viewport, including the 720/1440 "tablet"/"desktop" checks, would
  // render under mobile touch emulation at a mismatched pixel density
  // (ETNI-543 review round 3). Pin the context to the references' actual
  // capture profile regardless of which project runs the file.
  test.use({ deviceScaleFactor: 1, isMobile: false, hasTouch: false });

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

      // Anchor the clip to the live HomeHero section's own measured
      // boundingBox (REQ-115: the hero is no longer a fixed-height band, so
      // neither its top nor its height can be a hardcoded guess) instead of
      // the fallback constants above. Both sides must regenerate together
      // (--update-snapshots) whenever the composition's height changes,
      // since toHaveScreenshot requires identical image sizes to diff.
      const heroBox = await page
        .locator(`section[aria-label="${PRODUCT_NAME}"]`)
        .boundingBox();
      const clipY = heroBox ? Math.round(heroBox.y) : reference.clipY;
      const clipHeight = heroBox
        ? Math.round(heroBox.height)
        : reference.clipHeight;

      await expect(page).toHaveScreenshot(reference.name, {
        animations: "disabled",
        caret: "hide",
        clip: {
          x: 0,
          y: clipY,
          width: reference.width,
          height: clipHeight,
        },
        maxDiffPixelRatio: reference.maxDiffPixelRatio,
      });
    });
  }
});

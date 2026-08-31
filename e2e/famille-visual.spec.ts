import { expect, test } from "@playwright/test";
import { getFamilyRoute } from "@/lib/routing";

/**
 * Parity of the family fiche against the committed mockup
 * (docs/design/mockups/pages/famille.html).
 *
 * The references in e2e/__screenshots__/mockup-reference/ are captured from the
 * mockup, never from the application — regenerate them with
 * `node scripts/design/captureMockupReferences.mjs famille` after rebuilding
 * the mockup. Capturing them from the app would make this spec assert that the
 * app matches itself.
 *
 * ── The globe canvas is excluded ─────────────────────────────────────────
 * Both sides hide `canvas` inside the globe band before capture. WebGL output
 * depends on GPU, driver and headless backend, so diffing it produces a gate
 * that fails on the machine rather than on the code. What stays in the diff is
 * everything parity is actually defined on: the night band's composition, the
 * caption, the country picker, the three view buttons, the ochre seam, and the
 * whole parchment. The globe's own encodings are asserted structurally instead,
 * in overlays.test.ts, AtlasGlobeCanvas.test.tsx and AtlasGlobe.test.tsx.
 *
 * ── The references have an expiry date ───────────────────────────────────
 * They were captured against a corpus state where the family fiche's
 * `generalInfo.branches` and `distribution.distributionByCountry` read empty in
 * the recette database — which is why both "vide" cards appear. All 24 fiches
 * in `dataset/source/afrik/famille_linguistique/` already declare both fields;
 * the loader has simply never reached the database. The day the corpus is
 * synced, those two cards switch to their populated state and this spec goes
 * red — correctly. The fix that day is to regenerate the references, never to
 * raise maxDiffPixelRatio to silence them.
 */

const FAMILY_URL = getFamilyRoute("fr", "FLG_BENOUECONGO");

const referenceWidths = [
  // Mobile first: this is the width the design is settled at, and the only one
  // whose failure means the page is wrong rather than merely different.
  { width: 430, height: 900, maxDiffPixelRatio: 0.08 },
  { width: 720, height: 1024, maxDiffPixelRatio: 0.08 },
  { width: 1240, height: 900, maxDiffPixelRatio: 0.08 },
] as const;

test.describe("Family fiche visual parity", () => {
  // The references were captured at deviceScaleFactor 1 with no touch
  // emulation, so their pixel width equals their CSS width. Pin the context to
  // that profile regardless of which playwright.config.ts project runs the
  // file, exactly as home-visual.spec.ts does.
  test.use({ deviceScaleFactor: 1, isMobile: false, hasTouch: false });

  for (const reference of referenceWidths) {
    // @req REQ-116
    test(`matches the mockup at ${reference.width}px`, async ({ page }) => {
      await page.setViewportSize({
        width: reference.width,
        height: reference.height,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        ([key, value]) => window.localStorage.setItem(key, value),
        ["afh-consent", "accepted"]
      );

      await page.goto(FAMILY_URL);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);

      // Same exclusion the reference capture applies — see the header comment.
      await page.addStyleTag({
        content: `canvas { visibility: hidden !important; }`,
      });

      await expect(page).toHaveScreenshot(
        `mockup-reference/famille-${reference.width}.png`,
        {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: reference.maxDiffPixelRatio,
        }
      );
    });
  }
});

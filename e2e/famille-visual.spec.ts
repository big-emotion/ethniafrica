import { expect, test } from "@playwright/test";
import { getFamilyRoute } from "@/lib/routing";
import { LOCALE } from "./support/locale";

// The reference renders were captured in French. Under another locale the
// diff measures the translation, not the layout, so the English matrix leg
// skips this spec until it has references of its own.
test.skip(
  LOCALE !== "fr",
  "English copy lands per wave — the reference renders are French"
);

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

const FAMILY_URL = getFamilyRoute(LOCALE, "FLG_BENOUECONGO");

const referenceWidths = [
  // Mobile first: this is the width the design is settled at, and the only one
  // whose failure means the page is wrong rather than merely different.
  { width: 430, height: 900, maxDiffPixelRatio: 0.08 },
  { width: 720, height: 1024, maxDiffPixelRatio: 0.08 },
  { width: 1240, height: 900, maxDiffPixelRatio: 0.08 },
] as const;

/**
 * The one fact the parity diff surfaced that does not wait on a design
 * decision: at 430px the family fiche scrolls sideways to 670px, because each
 * `li.afh-member` in the members list (FamilyParchment.tsx, styled in
 * fiche-parchment.css) lays out 638px wide.
 *
 * Marked as an expected failure rather than skipped. The bug stays on the
 * report, and the day the list fits the phone this test passes unexpectedly
 * and goes red — which is the prompt to delete the marker.
 */
// @req REQ-116
test.describe("Family fiche at the mobile source-of-truth width", () => {
  // @req REQ-116
  test("does not scroll sideways at 430px", async ({ page }) => {
    test.fail(
      true,
      "Known product bug: li.afh-member lays out 638px wide at 430px, so the fiche scrolls to 670px"
    );
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(FAMILY_URL);
    await page.waitForLoadState("networkidle");

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    ).toBe(true);
  });
});

test.describe("Family fiche visual parity", () => {
  // The references were captured at deviceScaleFactor 1 with no touch
  // emulation, so their pixel width equals their CSS width. Pin the context to
  // that profile regardless of which playwright.config.ts project runs the
  // file, exactly as home-visual.spec.ts does.
  test.use({ deviceScaleFactor: 1, isMobile: false, hasTouch: false });

  // The references were never compared against until 2026-09-12: the snapshot
  // path template pointed into a directory #401 deleted, so every run wrote
  // the app's own render as the "missing" reference and failed on that. With
  // the path repaired, the app and the mockup measure 10 630px against 3 899px
  // tall at 430 — a different page, not a drifted one. Regenerating the
  // references from the mockup cannot close that gap, and capturing them from
  // the app would make this spec assert that the app matches itself, so the
  // decision (rebuild the mockup, or retire the oracle) belongs to the art
  // direction and is left visible here rather than taken silently.
  test.fixme(
    true,
    "The family fiche no longer matches the committed mockup (10 630px vs 3 899px tall at 430px); the reference needs an art-direction decision"
  );

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

      // Path segments rather than one string with a slash: Playwright flattens
      // a slash in a string name to a dash, and the lookup then misses the
      // reference that sits in its own directory.
      await expect(page).toHaveScreenshot(
        ["mockup-reference", `famille-${reference.width}.png`],
        {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: reference.maxDiffPixelRatio,
        }
      );
    });
  }
});

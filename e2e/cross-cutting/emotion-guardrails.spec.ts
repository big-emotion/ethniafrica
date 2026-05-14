import { test } from "../support/fixtures";
import {
  expectNoAutoplayMedia,
  expectNoLeaderboardsOrCounters,
  expectNoPinnedBannerOnLive,
  expectNoPopupsOrWalls,
  expectTapTargetsAtLeast44px,
} from "../support/guardrails";

// TEA Test Design R-10 — "Emotions to avoid" silently regress.
// One spec that sweeps every reading-surface URL pattern and asserts the
// negative surface. Adds new URLs as new public surfaces ship. Adds new
// assertions as new "emotions to avoid" surface in UX retros.

// Reading-surface URLs that already exist or are coming soon in Phase 1.
// Comment-out the lines that 404 today; uncomment as primitives ship.
const READING_SURFACE_URLS = [
  "/fr/pays/COM",
  // "/fr/peuples/PPL_YORUBA",     // Phase 1 — People page
  // "/fr/familles/FLG_NIGER_CONGO", // Phase 1 — Family page
  // "/fr/recherche",                // Search page (existing in some form)
] as const;

for (const url of READING_SURFACE_URLS) {
  test.describe(`@phase-1 @emotion-guardrail — ${url}`, () => {
    test(`no popups, cookie walls, paywalls, signup walls`, async ({
      page,
    }) => {
      await page.goto(url);
      await expectNoPopupsOrWalls(page);
    });

    test(`no leaderboards, engagement counters, avatar piles`, async ({
      page,
    }) => {
      await page.goto(url);
      await expectNoLeaderboardsOrCounters(page);
    });

    test(`no autoplay video or audio`, async ({ page }) => {
      await page.goto(url);
      await expectNoAutoplayMedia(page);
    });

    test(`tap targets ≥ 44px @nfr-a11y`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await expectTapTargetsAtLeast44px(page);
    });

    test(`95% rule — no pinned banner on live URL`, async ({ page }) => {
      await page.goto(url);
      await expectNoPinnedBannerOnLive(page);
    });
  });
}

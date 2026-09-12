import { test } from "../support/fixtures";
import {
  expectNoAutoplayMedia,
  expectNoLeaderboardsOrCounters,
  expectNoPinnedBannerOnLive,
  expectNoPopupsOrWalls,
  expectTapTargetsAtLeast44px,
} from "../support/guardrails";
import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { LOCALE } from "../support/locale";

// TEA Test Design R-10 — "Emotions to avoid" silently regress.
// One spec that sweeps every reading-surface URL pattern and asserts the
// negative surface. Adds new URLs as new public surfaces ship. Adds new
// assertions as new "emotions to avoid" surface in UX retros.

// Reading-surface URLs that already exist or are coming soon in Phase 1.
// Comment-out the lines that 404 today; uncomment as primitives ship.
const READING_SURFACE_URLS = [
  getCountryRoute(LOCALE, "COM"),
  // The people fiche renders server-side now, so the guardrails can hold it
  // to the same five checks as every other reading surface.
  getPeopleRoute(LOCALE, "PPL_YORUBA"),
  // getFamilyRoute(LOCALE, "FLG_NIGER_CONGO"), // Phase 1 — Family page
  // getLocalizedRoute(LOCALE, "search"),                // Search page (existing in some form)
] as const;

/**
 * Tap-target offenders measured on 2026-09-12 in components this suite's owner
 * cannot change in the same pull request. Declared as expected failures, per
 * URL, so the rest of the sweep keeps gating: the day the last offender is
 * fixed the test passes unexpectedly and goes red, and the entry is deleted.
 * An entry is never added to make a new regression green.
 */
const KNOWN_TAP_TARGET_DEBT: Partial<Record<string, string>> = {
  [getPeopleRoute(LOCALE, "PPL_YORUBA")]:
    "Known product bug: the ClassificationBadge doctrine link (30px) and the ExternalRegistryLinksSection registry links (22px) are under 44px",
};

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
      const debt = KNOWN_TAP_TARGET_DEBT[url];
      test.fail(debt !== undefined, debt);
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

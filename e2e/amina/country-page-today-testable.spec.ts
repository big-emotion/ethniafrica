import { test, expect } from "../support/fixtures";
import {
  expectNoAutoplayMedia,
  expectNoLeaderboardsOrCounters,
  expectNoPinnedBannerOnLive,
  expectNoPopupsOrWalls,
  expectTapTargetsAtLeast44px,
} from "../support/guardrails";

// TEA Test Design §4.2 — today-testable subset.
// The country detail page (CountryDetailViewV2) is shipped today, so partial
// Amina coverage + a11y baseline can run before any Phase-1 primitive lands.
// This is the proof-of-framework: pass = scaffold works end-to-end.

const COUNTRY_ROUTE = "/fr/pays/COM"; // Comoros — small, stable fixture.

test.describe("@amina @phase-1 — today-testable country page", () => {
  test("1.0-E2E-001 renders the country detail page", async ({ page }) => {
    const response = await page.goto(COUNTRY_ROUTE);
    expect(
      response?.ok(),
      `Expected 2xx, got ${response?.status()} on ${COUNTRY_ROUTE}`
    ).toBe(true);
    // CountryDetailViewV2 ships an h1 with the country name. We don't assert
    // the text content here (data is owned by Supabase and the test should not
    // hardcode the canonical name); we assert the surface is present.
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("1.0-E2E-002 no popups, paywalls, or signup walls on first paint @emotion-guardrail", async ({
    page,
  }) => {
    await page.goto(COUNTRY_ROUTE);
    await expectNoPopupsOrWalls(page);
  });

  test("1.0-E2E-003 no leaderboards, engagement counters, or avatar piles @emotion-guardrail", async ({
    page,
  }) => {
    await page.goto(COUNTRY_ROUTE);
    await expectNoLeaderboardsOrCounters(page);
  });

  test("1.0-E2E-004 no autoplay media on reading surface @emotion-guardrail", async ({
    page,
  }) => {
    await page.goto(COUNTRY_ROUTE);
    await expectNoAutoplayMedia(page);
  });

  test("1.0-E2E-005 tap targets ≥ 44px on reading surface @nfr-a11y", async ({
    page,
  }) => {
    await page.goto(COUNTRY_ROUTE);
    // Wait for hydration so dynamically inserted CTAs are measurable.
    await page.waitForLoadState("networkidle");
    await expectTapTargetsAtLeast44px(page);
  });

  test("1.0-E2E-006 95% rule — no pinned banner on live URL @emotion-guardrail", async ({
    page,
  }) => {
    await page.goto(COUNTRY_ROUTE);
    await expectNoPinnedBannerOnLive(page);
  });
});

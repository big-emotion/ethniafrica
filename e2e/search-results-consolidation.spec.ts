import { expect, test } from "@playwright/test";
import { getLocalizedRoute } from "@/lib/routing";

/**
 * The two SERP rules ETNI-1796 (search results consolidation) calls out as
 * needing a Playwright assertion rather than a unit test: they are about the
 * actually-rendered page (computed style, font scale, breakpoint layout),
 * which happy-dom cannot see. The unit suites (RecherchePageContent.test.tsx,
 * DominantAnswerPanel.test.tsx) already cover the branching logic — this
 * spec only re-checks the two rendered-page facts on top of a live corpus.
 */

const SERP_URL = getLocalizedRoute("fr", "search");

// "Yoruba" is an exact-name match in the AFRIK corpus (dataset/source/afrik/
// peuples/FLG_BENOUECONGO/PPL_YORUBA.json) whose autonym string
// ("Yoruba (Yoruba eniyan)") differs from its main name — the one condition
// `selectPivot` needs to promote a head result and the one `RecherchePageContent`
// needs to render the exonym span at all.
const DOMINANT_QUERY = "Yoruba";
// Long enough to be well past the corpus, short enough to stay a single
// query — guaranteed zero hits, so `selectPivot` never gets a runner-up to
// compare against and the page falls back to the result-count head.
const NO_MATCH_QUERY = "zzzznonexistentqueryxyz12345";

test.beforeEach(async ({ page }) => {
  // Same consent bypass as e2e/home-search-first.spec.ts: this is a headless
  // run against a local dev server, not a human meeting the cookie banner —
  // setting the flag before navigation keeps the banner from ever mounting.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "ethni-consent",
      JSON.stringify({
        hasConsented: true,
        preferences: { essential: true, analytics: true, functional: true },
        consentDate: "2026-01-01T00:00:00.000Z",
      })
    );
  });
});

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth
  );
}

test.describe("SERP title rule (ETNI-1796)", () => {
  // @req REQ-124
  test("shows the brand title before any query is run", async ({ page }) => {
    await page.goto(SERP_URL);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Recherche");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  // @req REQ-124
  test("promotes the autonym to h1 with the exonym one rung below, inside the same element", async ({
    page,
  }) => {
    await page.goto(`${SERP_URL}?q=${encodeURIComponent(DOMINANT_QUERY)}`);
    await expect(page.getByTestId("search-pivot")).toBeVisible();

    // Exactly one h1 on the page — the pivot's heading is the page's only
    // title, not an addition next to a generic "Recherche" one.
    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings).toHaveCount(1);
    const h1 = headings.first();

    // AutonymExonymHeading's hero variant renders the autonym as the h1's
    // first <span> and, when an exonym exists, the exonym as its second —
    // no `lang` attribute is guaranteed here since RecherchePageContent
    // never passes an ISO code to this particular heading, so position
    // rather than `[lang]` is what locates each name.
    const spans = h1.locator("span");
    await expect(spans).toHaveCount(2);
    const autonymHandle = spans.nth(0);
    const autonymText = (await autonymHandle.textContent())?.trim() ?? "";
    expect(autonymText.toLowerCase()).toContain("yoruba");

    // The exonym is a plain span inside the h1 — not a second heading
    // element — carrying the fiche's main name, sized one typographic rung
    // below the autonym rather than promoted to its own <h2>.
    const exonymHandle = spans.nth(1);
    await expect(exonymHandle).toBeVisible();
    const [exonymTag, exonymFontSize, autonymFontSize] = await Promise.all([
      exonymHandle.evaluate((el) => el.tagName),
      exonymHandle.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      autonymHandle.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ]);
    expect(exonymTag).toBe("SPAN");
    expect(exonymFontSize).toBeLessThan(autonymFontSize);
  });

  // @req REQ-124
  test("falls back to the result-count text when no dominant answer emerges", async ({
    page,
  }) => {
    await page.goto(`${SERP_URL}?q=${encodeURIComponent(NO_MATCH_QUERY)}`);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("résultat");
    await expect(heading).toContainText(NO_MATCH_QUERY);
    await expect(page.getByTestId("search-pivot")).toHaveCount(0);
  });
});

test.describe("SERP dominant-answer panel rule (ETNI-1796)", () => {
  // @req REQ-124
  test("renders beside the grid, not pinned with position: sticky, above the tablet breakpoint", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${SERP_URL}?q=${encodeURIComponent(DOMINANT_QUERY)}`);
    await expect(page.getByTestId("search-pivot")).toBeVisible();

    const panel = page.getByTestId("dominant-answer-panel-wrapper");
    await expect(panel).toBeVisible();

    const main = page.getByTestId("search-results-main");
    const [panelBox, mainBox, position] = await Promise.all([
      panel.boundingBox(),
      main.boundingBox(),
      panel.evaluate((el) => getComputedStyle(el).position),
    ]);
    expect(panelBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    // Beside the grid, not below it: the panel starts to the right of the
    // main column rather than under it.
    expect(panelBox!.x).toBeGreaterThanOrEqual(mainBox!.x + mainBox!.width);
    expect(position).not.toBe("sticky");

    expect(await noHorizontalScroll(page)).toBe(true);
  });

  // @req REQ-124
  test("stays visible at exactly the 720px tablet breakpoint", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 720, height: 1024 });
    await page.goto(`${SERP_URL}?q=${encodeURIComponent(DOMINANT_QUERY)}`);
    await expect(page.getByTestId("search-pivot")).toBeVisible();

    const panel = page.getByTestId("dominant-answer-panel-wrapper");
    await expect(panel).toBeVisible();
    expect(
      await panel.evaluate((el) => getComputedStyle(el).position)
    ).not.toBe("sticky");
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  // NOTE on the ticket's originally-cited "bottom sheet" below the
  // breakpoint: this worktree's RecherchePageContent (ETNI-1807, see its
  // unit test "hides the complementary answer below 720px and reveals it at
  // that breakpoint") hides the panel outright below 720px rather than
  // re-mounting its facts as a bottom sheet — no such component exists
  // anywhere in src/. This assertion documents the shipped behaviour rather
  // than the ticket's original description; the discrepancy is flagged back
  // to the parent ticket rather than silently asserting a sheet that was
  // never built.
  // @req REQ-124
  test("hides the panel below the tablet breakpoint (no bottom sheet exists in this build)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 812 });
    await page.goto(`${SERP_URL}?q=${encodeURIComponent(DOMINANT_QUERY)}`);
    await expect(page.getByTestId("search-pivot")).toBeVisible();

    const panel = page.getByTestId("dominant-answer-panel-wrapper");
    await expect(panel).toBeHidden();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

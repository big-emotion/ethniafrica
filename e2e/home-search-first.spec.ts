import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const HOME_URL = "/fr?hero=mercator";
const MOBILE_VIEWPORT = { width: 430, height: 812 } as const;
const DESKTOP_VIEWPORT = { width: 1240, height: 900 } as const;
const FIRST_FOLD_GLOBE_PX = 120;

type ElementBox = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

async function elementBox(locator: Locator): Promise<ElementBox> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

function bottom(box: ElementBox): number {
  return box.y + box.height;
}

function right(box: ElementBox): number {
  return box.x + box.width;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
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
  await page.goto(HOME_URL);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

// @req REQ-112
test.describe("Search-first home — mobile source of truth (ETNI-1513)", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  // @req REQ-112
  test("puts search and a material part of the globe in the first 430px fold", async ({
    page,
  }) => {
    const hero = page.locator(".home-hero");
    const inner = hero.locator(".home-hero-inner");
    const copy = inner.locator(".home-hero-copy");
    const search = copy.getByRole("search");
    const seeds = copy.getByRole("list", { name: "Exemples de recherche" });
    const globe = inner.locator(".home-hero-globe .home-globe-stage");
    const counts = inner.locator(".home-hero-counts");
    const fact = page.getByTestId("home-did-you-know");

    await expect(seeds.getByRole("button")).toHaveCount(3);
    await expect(page.getByTestId(/^home-count-/)).toHaveCount(5);
    await expect(fact).toHaveCount(1);
    await expect(
      page.locator('.home-hero + [data-testid="home-did-you-know"]')
    ).toHaveCount(1);

    const searchBox = await elementBox(search);
    const seedsBox = await elementBox(seeds);
    const globeBox = await elementBox(globe);
    const countsBox = await elementBox(counts);
    const factBox = await elementBox(fact);

    expect(searchBox.y).toBeGreaterThanOrEqual(0);
    expect(bottom(searchBox)).toBeLessThanOrEqual(MOBILE_VIEWPORT.height);
    expect(globeBox.y).toBeLessThan(MOBILE_VIEWPORT.height);
    expect(
      Math.min(bottom(globeBox), MOBILE_VIEWPORT.height) -
        Math.max(globeBox.y, 0)
    ).toBeGreaterThanOrEqual(FIRST_FOLD_GLOBE_PX);

    // Reading order and the one-column visual order must agree on mobile.
    const copyFlow = await copy
      .locator('form[role="search"], ul[aria-label="Exemples de recherche"]')
      .evaluateAll((nodes) => nodes.map((node) => node.tagName));
    expect(copyFlow).toEqual(["FORM", "UL"]);

    const pageFlow = await page
      .locator(
        ".home-hero-copy, .home-hero-globe, .home-hero-counts, " +
          '[data-testid="home-did-you-know"]'
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          if (node.classList.contains("home-hero-copy")) return "copy";
          if (node.classList.contains("home-hero-globe")) return "globe";
          if (node.classList.contains("home-hero-counts")) return "counts";
          return "fact";
        })
      );
    expect(pageFlow).toEqual(["copy", "globe", "counts", "fact"]);

    expect(seedsBox.y).toBeGreaterThanOrEqual(bottom(searchBox) - 1);
    expect(globeBox.y).toBeGreaterThanOrEqual(bottom(seedsBox) - 1);
    expect(countsBox.y).toBeGreaterThanOrEqual(bottom(globeBox) - 1);
    expect(factBox.y).toBeGreaterThanOrEqual(bottom(countsBox) - 1);

    // A content-driven band keeps the same used height when only the viewport
    // height changes. The computed floors also rule out vh/svh/dvh min-size
    // constraints without inspecting implementation source text.
    const readSizing = (locator: Locator) =>
      locator.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          height: element.getBoundingClientRect().height,
          minHeight: style.minHeight,
          maxHeight: style.maxHeight,
          minBlockSize: style.minBlockSize,
          maxBlockSize: style.maxBlockSize,
        };
      });

    const heroSizing = await readSizing(hero);
    const innerSizing = await readSizing(inner);
    for (const sizing of [heroSizing, innerSizing]) {
      expect(sizing.minHeight).toBe("0px");
      expect(sizing.maxHeight).toBe("none");
      expect(sizing.minBlockSize).toBe("0px");
      expect(sizing.maxBlockSize).toBe("none");
    }

    await page.setViewportSize({ width: MOBILE_VIEWPORT.width, height: 932 });
    await expect
      .poll(async () =>
        Math.abs((await readSizing(hero)).height - heroSizing.height)
      )
      .toBeLessThanOrEqual(1);
    expect(
      Math.abs((await readSizing(inner)).height - innerSizing.height)
    ).toBeLessThanOrEqual(1);
  });
});

// @req REQ-112
test.describe("Search-first home — desktop widening pass (ETNI-1513)", () => {
  test.use({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });

  // @req REQ-112
  test("widens to two columns and lets the single fact span below them", async ({
    page,
  }) => {
    const hero = page.locator(".home-hero");
    const inner = hero.locator(".home-hero-inner");
    const copy = inner.locator(".home-hero-copy");
    const seeds = copy.getByRole("list", { name: "Exemples de recherche" });
    const globe = inner.locator(".home-hero-globe");
    const counts = inner.locator(".home-hero-counts");
    const fact = page.getByTestId("home-did-you-know");

    await expect(seeds.getByRole("button")).toHaveCount(4);
    await expect(page.getByTestId(/^home-count-/)).toHaveCount(5);
    await expect(fact).toHaveCount(1);
    await expect(
      page.locator('.home-hero + [data-testid="home-did-you-know"]')
    ).toHaveCount(1);

    const innerBox = await elementBox(inner);
    const copyBox = await elementBox(copy);
    const seedsBox = await elementBox(seeds);
    const globeBox = await elementBox(globe);
    const countsBox = await elementBox(counts);
    const factBox = await elementBox(fact);

    // Copy/counters form the left column; the globe is the right column.
    expect(right(copyBox)).toBeLessThan(globeBox.x);
    expect(globeBox.x).toBeGreaterThan(copyBox.x);
    expect(
      Math.min(bottom(copyBox), bottom(globeBox)) -
        Math.max(copyBox.y, globeBox.y)
    ).toBeGreaterThan(100);
    expect(countsBox.y).toBeGreaterThanOrEqual(bottom(seedsBox) - 1);
    expect(countsBox.x).toBeLessThan(globeBox.x);
    expect(right(countsBox)).toBeLessThanOrEqual(globeBox.x);

    // The fact is the next section, below both columns, and spans their full
    // composition rather than becoming a third card or a right-column tail.
    expect(factBox.y).toBeGreaterThanOrEqual(
      Math.max(bottom(countsBox), bottom(globeBox)) - 1
    );
    expect(factBox.x).toBeLessThanOrEqual(innerBox.x + 1);
    expect(right(factBox)).toBeGreaterThanOrEqual(right(innerBox) - 1);
  });
});

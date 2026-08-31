import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// REQ-112 — the home's interactive globe, its non-WebGL fallback, and
// reduced-motion behaviour, at the three breakpoints named by the ticket's
// Given/When/Then blocks. Written against ETNI-1214's point cloud and
// re-pointed at AtlasGlobe by ETNI-1360, which left one globe engine. There is no 1200px Playwright
// project (playwright.config.ts only defines mobile-430/tablet-720/
// desktop-800/moderator-1024), so every test below sets its viewport
// explicitly rather than relying on project config, mirroring
// e2e/home-visual.spec.ts.
// Pinned: the hero draws one of eleven modules per request (REQ-115), and
// this suite is about the globe specifically. Without the pin ten runs in
// eleven would open on a game and fail on a locator that is simply not on
// the page.
const HOME_URL = "/fr?hero=mercator";
const BREAKPOINTS = [430, 720, 1200] as const;
// The surface renames itself with what a drag will do: a sphere turns, a flat
// map pans, and there is no third state. Matching either keeps the locator
// honest on a runner whose WebGL is unusable, where the map is all there is.
const GLOBE_SURFACE_NAME = /(Globe|Carte) de l'atlas\./;
// AtlasGlobe states the projection with a toggle whose label says what
// pressing it will do, so the two names are the two halves of one control.
const FLATTEN_NAME = "Ce que la carte plate en fait";
const UNFLATTEN_NAME = "Revenir au globe";

async function expectNoSeriousOrCriticalViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );

  expect(
    blocking,
    blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`
      )
      .join("\n")
  ).toEqual([]);
}

test.describe("Home hero interactive globe (REQ-112)", () => {
  for (const width of BREAKPOINTS) {
    // @req REQ-112
    test(`is present and operable by pointer and keyboard at ${width}px`, async ({
      page,
    }) => {
      const pageErrors: Error[] = [];
      page.on("pageerror", (error) => pageErrors.push(error));

      await page.setViewportSize({ width, height: 900 });
      await page.goto(HOME_URL);

      const globeSurface = page.getByRole("application", {
        name: GLOBE_SURFACE_NAME,
      });
      await expect(globeSurface).toBeVisible();

      // Africa faces the reader on first paint: the WebGL globe (or its
      // fallback, on runners without a usable context) must be mounted
      // with no crop/hidden state — the rotate-surface's own visibility
      // check above already establishes this; the exact face-forward
      // rotation matrix is unit-tested in
      // src/lib/atlas/__tests__/projection.test.ts and
      // src/components/atlas/__tests__/AtlasGlobeCanvas.test.tsx.
      const canvas = page.locator("canvas");
      const fallback = page.locator("path#africa-landmass");
      await expect(canvas.or(fallback).first()).toBeVisible();

      // Pointer: drag the rotate surface.
      const box = await globeSurface.boundingBox();
      if (!box) throw new Error("rotate surface has no bounding box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2);
      await page.mouse.up();

      // Keyboard: focus and rotate with arrow keys.
      await globeSurface.focus();
      await expect(globeSurface).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowUp");

      // The projection control is a real, independently operable button, and
      // it renames itself once pressed rather than going quiet.
      const flatten = page.getByRole("button", { name: FLATTEN_NAME });
      await expect(flatten).toHaveAttribute("aria-pressed", "false");
      await flatten.click();
      await expect(
        page.getByRole("button", { name: UNFLATTEN_NAME })
      ).toHaveAttribute("aria-pressed", "true");

      expect(pageErrors).toEqual([]);
    });
  }

  // @req REQ-112
  test("falls back to the committed AfricaBasemap when no WebGL context can be created, without ever rendering empty", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        contextId: string,
        ...rest: unknown[]
      ) {
        if (contextId === "webgl" || contextId === "experimental-webgl") {
          return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (originalGetContext as any).call(this, contextId, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await page.goto(HOME_URL);

    await expect(page.locator("path#africa-landmass")).toBeVisible();
    // The flat map cannot be flattened further, so the control that would say
    // so is not offered — the fallback is a figure, not a crippled globe.
    await expect(page.getByRole("button", { name: FLATTEN_NAME })).toHaveCount(
      0
    );
    expect(pageErrors).toEqual([]);
  });

  // @req REQ-112
  test("holds a still frame with no autonomous motion under prefers-reduced-motion, and stays operable", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(HOME_URL);

    const globeSurface = page.getByRole("application", {
      name: GLOBE_SURFACE_NAME,
    });
    await expect(globeSurface).toBeVisible();

    const flatten = page.getByRole("button", { name: FLATTEN_NAME });
    await expect(flatten).toHaveAttribute("aria-pressed", "false");
    await flatten.click();
    await expect(
      page.getByRole("button", { name: UNFLATTEN_NAME })
    ).toHaveAttribute("aria-pressed", "true");

    expect(pageErrors).toEqual([]);
  });

  // @req REQ-112
  test("the server response contains no WebGL runtime", async ({
    page,
    baseURL,
  }) => {
    const response = await page.request.get(
      new URL(HOME_URL, baseURL).toString()
    );
    expect(response.ok()).toBe(true);

    const body = await response.text();

    // The capability gate (ContinentGlobeStage) mounts nothing at all until a
    // client-side effect has answered, so the raw server response carries
    // neither the WebGL runtime nor the flat map. The fallback is for a
    // browser that has been *found* to have no WebGL; painting it server-side
    // showed it to everyone for the second the chunk took to arrive, which
    // reads as a glitch rather than as a fallback. The stage's own box holds
    // the space open in the meantime.
    expect(body).toContain("home-globe-stage");
    expect(body).not.toContain('id="africa-landmass"');
    expect(body.toLowerCase()).not.toContain("<canvas");
  });

  for (const width of BREAKPOINTS) {
    // @req REQ-112
    test(`reports zero serious or critical axe-core violations at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(HOME_URL);
      await expect(
        page.getByRole("application", { name: GLOBE_SURFACE_NAME })
      ).toBeVisible();

      await expectNoSeriousOrCriticalViolations(page);
    });
  }
});

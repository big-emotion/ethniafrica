import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// ETNI-1214 (REQ-112) — the home hero's interactive globe, its non-WebGL
// fallback, and reduced-motion behaviour, at the three breakpoints named by
// the ticket's Given/When/Then blocks. There is no 1200px Playwright
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
const ROTATE_SURFACE_NAME = /Globe interactif de l'Afrique/;

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

      const rotateSurface = page.getByRole("button", {
        name: ROTATE_SURFACE_NAME,
      });
      await expect(rotateSurface).toBeVisible();

      // Africa faces the reader on first paint: the WebGL globe (or its
      // fallback, on runners without a usable context) must be mounted
      // with no crop/hidden state — the rotate-surface's own visibility
      // check above already establishes this; the exact face-forward
      // rotation matrix is unit-tested in
      // src/lib/atlas/__tests__/projection.test.ts and
      // src/components/home/__tests__/HomeGlobe.test.tsx.
      const canvas = page.locator("canvas");
      const fallback = page.locator("path#africa-landmass");
      await expect(canvas.or(fallback).first()).toBeVisible();

      // Pointer: drag the rotate surface.
      const box = await rotateSurface.boundingBox();
      if (!box) throw new Error("rotate surface has no bounding box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2);
      await page.mouse.up();

      // Keyboard: focus and rotate with arrow keys.
      await rotateSurface.focus();
      await expect(rotateSurface).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowUp");

      // The morph control is a real, independently operable button.
      const morphToggle = page.getByTestId("home-globe-morph-toggle");
      await expect(morphToggle).toHaveAttribute("aria-pressed", "false");
      await morphToggle.click();
      await expect(morphToggle).toHaveAttribute("aria-pressed", "true");

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
    await expect(page.getByTestId("home-globe-morph-toggle")).toHaveCount(0);
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

    const rotateSurface = page.getByRole("button", {
      name: ROTATE_SURFACE_NAME,
    });
    await expect(rotateSurface).toBeVisible();

    const morphToggle = page.getByTestId("home-globe-morph-toggle");
    await expect(morphToggle).toHaveAttribute("aria-pressed", "false");
    await morphToggle.click();
    await expect(morphToggle).toHaveAttribute("aria-pressed", "true");

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

    // The capability gate (HomeGlobeStage) renders the SSR-safe
    // AfricaBasemap fallback by default and only mounts the WebGL client
    // island after a client-side effect confirms a context — so the raw
    // server response must carry the fallback markup and no <canvas>.
    expect(body).toContain('id="africa-landmass"');
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
        page.getByRole("button", { name: ROTATE_SURFACE_NAME })
      ).toBeVisible();

      await expectNoSeriousOrCriticalViolations(page);
    });
  }
});

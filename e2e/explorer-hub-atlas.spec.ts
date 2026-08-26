import { test, expect } from "./support/fixtures";

const EXPLORER_URL = "/fr/explorer";

// The four module links are server-rendered and unconditional, so the map
// is scenery over a working page — never the only way in. Neutralising
// WebGL is the cheapest way to prove that, and it is also the path every
// reader takes on the first paint: AtlasGlobe starts with webglSupported
// false and only raises it in an effect.
async function blockWebgl(page: import("@playwright/test").Page) {
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
}

const MODULE_IDS = ["peuples", "pays", "familles", "recherche"];

// @req REQ-116
test.describe("explorer hub — the continent scene", () => {
  // @req REQ-116
  test("keeps every module link reachable at 430px with no WebGL", async ({
    page,
  }) => {
    await blockWebgl(page);
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(EXPLORER_URL);

    for (const id of MODULE_IDS) {
      await expect(page.getByTestId(`hub-module-link-${id}`)).toBeVisible();
    }

    // The SVG fallback, not a canvas — this is what the first paint shows.
    await expect(page.locator("path#africa-landmass").first()).toBeVisible();
  });

  // Focus order is list-then-scene at every width. The layout reaches its
  // desktop two-column shape by grid placement alone, never `order:`, so
  // DOM order and visual order agree (WCAG 1.3.2 / 2.4.3).
  // @req REQ-116
  test("puts the module list ahead of the scene in the focus order", async ({
    page,
  }) => {
    await blockWebgl(page);
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(EXPLORER_URL);

    const list = page.getByRole("list").first();
    const scene = page.getByTestId("explorer-continent");

    const listBeforeScene = await list.evaluate(
      (node, sceneNode) =>
        Boolean(
          node.compareDocumentPosition(sceneNode as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      await scene.elementHandle()
    );

    expect(listBeforeScene).toBe(true);
  });

  // @req REQ-116
  test("still lists every module with the camera stilled", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await blockWebgl(page);
    await page.goto(EXPLORER_URL);

    for (const id of MODULE_IDS) {
      await expect(page.getByTestId(`hub-module-link-${id}`)).toBeVisible();
    }

    await context.close();
  });
});

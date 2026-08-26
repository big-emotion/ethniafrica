/**
 * Capture the visual references for the fiche parity specs from the committed
 * mockup — never from the application, which is the thing under test.
 *
 * Usage:
 *   node docs/design/mockups/build.js          # needs parts/three.inline.js
 *   node scripts/design/captureMockupReferences.mjs famille
 *
 * The mockup sizes itself with a container query on `.frame`
 * (container-type: inline-size, breakpoint at 760px), not with media queries,
 * so a "viewport" here means the width forced onto that element. The page
 * viewport is set wider than the frame purely to give it room.
 *
 * The globe canvas is hidden before capture. Its pixels come from WebGL and
 * differ by GPU, driver and headless backend; diffing them would produce a gate
 * that fails on the machine rather than on the code. Everything around it —
 * nav, caption, picker, view buttons, seam, and the whole parchment — stays
 * inside the comparison, which is where parity is actually defined. The app
 * side of the diff hides its own canvas the same way.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const distDir = path.join(repoRoot, "docs/design/mockups/dist");
const outDir = path.join(repoRoot, "e2e/__screenshots__/mockup-reference");

/** Matches the three widths the parity specs assert, mobile first. */
const WIDTHS = [430, 720, 1240];

const page = process.argv[2] ?? "famille";

const html = await readFile(path.join(distDir, `${page}.html`), "utf8").catch(
  () => {
    console.error(
      `Missing ${distDir}/${page}.html — run \`node docs/design/mockups/build.js\` first ` +
        `(it needs parts/three.inline.js; see docs/design/mockups/README.md).`
    );
    process.exit(1);
  }
);

// Served over HTTP rather than opened as file:// so the Google Fonts stylesheet
// resolves the same way it does in the app — the mono face is load-bearing for
// every tabular-nums column in these captures.
const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}/`;

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: width + 80, height: 1200 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const tab = await context.newPage();
    await tab.goto(origin, { waitUntil: "networkidle" });

    await tab.addStyleTag({
      content: `
        .bench-bar { display: none !important; }
        .frame { width: ${width}px !important; max-width: none !important;
                 margin: 0 !important; border: 0 !important; border-radius: 0 !important;
                 box-shadow: none !important; transition: none !important; }
        /* The reference is the page at rest. These four are absolutely
           positioned and parked off-frame when closed (the sheet sits at
           translateY(101%)); an element screenshot ignores the frame's
           overflow:hidden and would bake them in as empty boxes. States with
           one of them open are asserted by the a11y specs, not here. */
        .sheet[data-open="false"],
        .drawer[data-open="false"],
        .scrim[data-open="false"],
        .megapanel[data-open="false"] { display: none !important; }
        /* visibility, not a Playwright mask: a mask paints a rectangle over the
           canvas box, and the caption, picker and view buttons are overlaid
           inside that box — masking would drop the very chrome parity is about.
           visibility:hidden removes the GPU pixels and keeps everything
           stacked above the canvas painting normally. */
        canvas#globe { visibility: hidden !important; }
      `,
    });
    // The frame carries the container query; sizing it is what changes layout.
    await tab.evaluate((w) => {
      const frame = document.getElementById("frame");
      frame.dataset.viewport = w < 760 ? "mobile" : "desktop";
    }, width);

    await tab.evaluate(() => document.fonts.ready);
    // The globe's reveal is a 1100ms cubic-out; let it settle so the chrome
    // around it (tools, caption) is drawn in its resting state.
    await tab.waitForTimeout(1500);

    const frame = tab.locator("#frame");
    const file = path.join(outDir, `${page}-${width}.png`);
    await frame.screenshot({
      path: file,
      animations: "disabled",
    });
    console.log(`${path.relative(repoRoot, file)}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

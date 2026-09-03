import { chromium, Browser, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import axeCore from "axe-core";
import type { RunOptions } from "axe-core";
import { createServer, Server } from "http";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import { join, extname, resolve } from "path";
import { LIVE_ROUTES } from "./a11yRoutes";
import { sweepInParallel } from "./lib/parallelSweep";

const STORYBOOK_STATIC_DIR = resolve(__dirname, "../storybook-static");
const STORYBOOK_PORT = 6006;

// Stories are audited concurrently because each one is independent: the sweep
// used to walk 367 of them through a single page, which was the slowest step of
// the only workflow that gates a merge. Four matches the vCPU count of a
// GitHub-hosted runner — axe's analysis is CPU-bound, so more lanes than cores
// trades throughput for contention.
const STORY_SWEEP_LANES = 4;

// axe-core's built-in `valid-lang` allowlist covers ISO 639-1 plus only a
// narrow subset of ISO 639-3, missing African-language codes this app
// legitimately renders via `lang` attributes (UX-DR38, ISO 639-3 is the
// AFRIK language identifier standard — see nameRecordParser.ts). Extend the
// built-in list rather than replace it, so genuinely invalid `lang` values
// are still caught. `validLangs` isn't part of axe-core's public TS types.
const AXE_UTILS = axeCore.utils as unknown as { validLangs: () => string[] };
const AFRIK_ISO_639_3_CODES = ["kon", "lin", "yor", "hau", "ibo", "ful", "wol"];
// axe-core's `RunOptions` type only exposes rule-level `{ enabled }` toggles,
// but check-level options (like `valid-lang`'s custom `value` list) are a
// runtime-supported `checks` key that the public TS types don't model. The
// cast is safe: this shape is accepted by axe-core's own `run()`/normalizeRunOptions.
const AXE_RUN_OPTIONS = {
  checks: {
    "valid-lang": {
      options: { value: [...AXE_UTILS.validLangs(), ...AFRIK_ISO_639_3_CODES] },
    },
  },
} as unknown as RunOptions;

// Where the built app is served. Set by .github/workflows/a11y.yml once the
// app is up — unset locally, the live-route step is skipped so the script
// still works without a running server. Which routes it audits, and why each
// one is on the list, is `a11yRoutes.ts`.
const LIVE_ROUTES_BASE_URL = process.env.A11Y_LIVE_BASE_URL;

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{ html: string; target: string[] }>;
}

interface StoryEntry {
  id: string;
  name: string;
  title: string;
}

async function startStaticServer(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      let urlPath = req.url?.split("?")[0] || "/";
      if (urlPath === "/") urlPath = "/index.html";
      const filePath = join(STORYBOOK_STATIC_DIR, urlPath);

      try {
        const info = await stat(filePath);
        if (info.isDirectory()) {
          const contentType = "text/html";
          res.writeHead(200, { "Content-Type": contentType });
          createReadStream(join(filePath, "index.html")).pipe(res);
          return;
        }
        const ext = extname(filePath);
        const contentType = MIME[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(STORYBOOK_PORT, "127.0.0.1", () => {
      resolve(server);
    });

    server.on("error", reject);
  });
}

async function getStoryIds(page: Page): Promise<StoryEntry[]> {
  await page.goto(`http://localhost:${STORYBOOK_PORT}/index.json`);
  const content = await page.textContent("body");

  if (!content) {
    throw new Error("Could not fetch stories index");
  }

  const storiesIndex = JSON.parse(content);
  const entries: StoryEntry[] = [];

  for (const [id, entry] of Object.entries(
    storiesIndex.entries || storiesIndex.v || {}
  )) {
    const storyEntry = entry as {
      type?: string;
      name?: string;
      title?: string;
    };
    if (storyEntry.type === "story") {
      entries.push({
        id,
        name: storyEntry.name || id,
        title: storyEntry.title || "",
      });
    }
  }

  return entries;
}

async function runLiveRouteAudit(browser: Browser): Promise<boolean> {
  if (!LIVE_ROUTES_BASE_URL) {
    console.log(
      `\nℹ️  A11Y_LIVE_BASE_URL not set — skipping live route audit (${LIVE_ROUTES.join(", ")}).`
    );
    return false;
  }

  console.log(
    `\n🌍 Auditing ${LIVE_ROUTES.length} live route(s) against ${LIVE_ROUTES_BASE_URL}...`
  );

  const context = await browser.newContext();
  let hasBlockingViolations = false;

  try {
    // Same lane budget as the story sweep: nineteen routes against a real Next
    // server, each waiting on `networkidle`, is most of what is left of this
    // job's wall clock once the stories run concurrently.
    const audits = await sweepInParallel(
      LIVE_ROUTES,
      STORY_SWEEP_LANES,
      async (route) => {
        const page = await context.newPage();

        try {
          const response = await page.goto(`${LIVE_ROUTES_BASE_URL}${route}`, {
            waitUntil: "networkidle",
            timeout: 30000,
          });

          // A crashed route is not an accessible route. Next's 500 page is
          // markup-clean, so axe happily returns zero violations on it and the
          // gate goes green over a fiche that never rendered — which is exactly
          // how the fiche routes stayed broken while this check passed. Fail on
          // the status before believing the audit.
          const status = response?.status() ?? 0;
          if (status >= 400) {
            return { status, violations: [] as AxeViolation[] };
          }

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .options(AXE_RUN_OPTIONS)
            .analyze();

          // Live routes gate on both `serious` and `critical` — stricter than
          // the Storybook check, which still tolerates the known Module #0
          // color-token violations tracked separately.
          return {
            status,
            violations: results.violations.filter(
              (v) => v.impact === "serious" || v.impact === "critical"
            ) as AxeViolation[],
          };
        } finally {
          await page.close();
        }
      }
    );

    // Reported in route order once the lanes have finished, so the log reads the
    // same way whatever order the routes happened to settle in.
    LIVE_ROUTES.forEach((route, index) => {
      const audit = audits[index];
      process.stdout.write(`🔍 Testing live route: ${route}... `);

      if (audit instanceof Error) {
        console.log(`❌ Error: ${audit.message}`);
        hasBlockingViolations = true;
        return;
      }

      if (audit.status >= 400) {
        console.log(`❌ HTTP ${audit.status} — route did not render`);
        hasBlockingViolations = true;
        return;
      }

      if (audit.violations.length === 0) {
        console.log("✅ Passed");
        return;
      }

      console.log(`❌ ${audit.violations.length} violation(s)`);
      hasBlockingViolations = true;

      for (const violation of audit.violations) {
        console.log(
          `\n  🚨 [${violation.impact?.toUpperCase()}] ${violation.id}`
        );
        console.log(`     ${violation.help}`);
        console.log(`     📎 ${violation.helpUrl}`);
        console.log(`     Affected elements:`);
        for (const node of violation.nodes.slice(0, 3)) {
          console.log(`       - ${node.target.join(" > ")}`);
        }
        if (violation.nodes.length > 3) {
          console.log(`       ... and ${violation.nodes.length - 3} more`);
        }
      }
    });
  } finally {
    await context.close();
  }

  return hasBlockingViolations;
}

async function runA11yTests(): Promise<void> {
  if (!existsSync(STORYBOOK_STATIC_DIR)) {
    console.error("❌ storybook-static directory not found.");
    console.error("   Please run 'npm run build-storybook' first.");
    process.exit(1);
  }

  console.log("🚀 Starting static server for Storybook...");
  const server = await startStaticServer();
  console.log(`✅ Server listening at http://localhost:${STORYBOOK_PORT}`);

  let browser: Browser | null = null;
  let hasViolations = false;
  const violationSummary: { storyId: string; violations: AxeViolation[] }[] =
    [];

  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const indexPage = await context.newPage();

    console.log("📚 Fetching story list...");
    const stories = await getStoryIds(indexPage);
    console.log(
      `   Found ${stories.length} stories to test (${STORY_SWEEP_LANES} at a time)\n`
    );
    await indexPage.close();

    const audits = await sweepInParallel(
      stories,
      STORY_SWEEP_LANES,
      async (story) => {
        const storyUrl = `http://localhost:${STORYBOOK_PORT}/iframe.html?id=${story.id}&viewMode=story`;
        // A page per story rather than a pool: Playwright opens one in tens of
        // milliseconds against the ~9 s an audit takes, and each lane then owns
        // its navigation outright.
        const page = await context.newPage();

        try {
          await page.goto(storyUrl, { waitUntil: "networkidle" });

          await page
            .waitForSelector("#storybook-root", { timeout: 10000 })
            .catch(() => {
              // Some stories might not have this selector, continue anyway
            });

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .options(AXE_RUN_OPTIONS)
            .analyze();

          // CI gate fails only on `critical`. `serious` violations are still
          // captured in the summary so they remain visible in the workflow log,
          // but they don't block merging while the Module #0 transparency-fabric
          // color tokens (PR #126) are being revised — see issue tracking
          // 21 color-contrast violations on DoctrineLinkCard / SourceChainSheet /
          // ClassificationBadge introduced by ETNI-26.
          return results.violations.filter(
            (v) => v.impact === "serious" || v.impact === "critical"
          ) as AxeViolation[];
        } finally {
          await page.close();
        }
      }
    );

    // Reported after the sweep rather than streamed during it: concurrent lanes
    // would interleave a half-written line with another story's verdict. Walking
    // the results in input order also makes the log identical run to run, which
    // a timing-ordered one would not be.
    stories.forEach((story, index) => {
      const audit = audits[index];
      const label = `🔍 ${story.title} - ${story.name}:`;

      if (audit instanceof Error) {
        console.log(`${label} ⚠️  Error: ${audit.message}`);
        return;
      }

      if (audit.length === 0) {
        console.log(`${label} ✅ Passed`);
        return;
      }

      const blocking = audit.filter((v) => v.impact === "critical");
      console.log(
        `${label} ${blocking.length > 0 ? "❌" : "⚠️"} ${audit.length} violation(s)`
      );
      if (blocking.length > 0) hasViolations = true;
      violationSummary.push({ storyId: story.id, violations: audit });
    });

    if (violationSummary.length > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("ACCESSIBILITY VIOLATION SUMMARY");
      console.log("=".repeat(80) + "\n");

      for (const { storyId, violations } of violationSummary) {
        console.log(`\n📖 Story: ${storyId}`);
        console.log("-".repeat(60));

        for (const violation of violations) {
          console.log(
            `\n  🚨 [${violation.impact?.toUpperCase()}] ${violation.id}`
          );
          console.log(`     ${violation.help}`);
          console.log(`     📎 ${violation.helpUrl}`);
          console.log(`     Affected elements:`);

          for (const node of violation.nodes.slice(0, 3)) {
            console.log(`       - ${node.target.join(" > ")}`);
          }

          if (violation.nodes.length > 3) {
            console.log(`       ... and ${violation.nodes.length - 3} more`);
          }
        }
      }

      console.log("\n" + "=".repeat(80));
    }

    console.log("\n📊 Test Summary:");
    console.log(`   Stories tested: ${stories.length}`);
    console.log(`   Stories with violations: ${violationSummary.length}`);
    console.log(
      `   Total violations: ${violationSummary.reduce((acc, s) => acc + s.violations.length, 0)}`
    );

    const liveRoutesHaveViolations = await runLiveRouteAudit(browser);
    if (liveRoutesHaveViolations) {
      hasViolations = true;
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    server.close();
  }

  if (hasViolations) {
    console.log("\n❌ Accessibility tests failed due to critical violations.");
    process.exit(1);
  } else {
    if (violationSummary.length > 0) {
      console.log(
        `\n⚠️  ${violationSummary.length} story(ies) report serious (non-blocking) violations — see summary above.`
      );
    } else {
      console.log("\n✅ All accessibility tests passed!");
    }
    process.exit(0);
  }
}

runA11yTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

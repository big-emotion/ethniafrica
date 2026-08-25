import { chromium, Browser, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import axeCore from "axe-core";
import type { RunOptions } from "axe-core";
import { createServer, Server } from "http";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import { join, extname, resolve } from "path";

const STORYBOOK_STATIC_DIR = resolve(__dirname, "../storybook-static");
const STORYBOOK_PORT = 6006;

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

// Live Next.js routes audited by axe-core in addition to Storybook. Set by
// .github/workflows/a11y.yml once the app is built and served — unset locally
// this step is skipped so the script still works without a running server.
//
// The three fiche routes are one representative assembled fiche per AFRIK
// entity type (FR102). All three are needed because the panel-kind ×
// entity-type matrix (panelRegistry.tsx) gives each type a different chapter
// sequence, so a panel regression can miss two of them entirely. Canonical
// AFRIK identifiers only — never display-name slugs (qualityGateRoutes.test.ts).
//
// The five routes above them are one representative route per charter
// route-family rolled out in 16.4–16.9 (ETNI-807 · FR110). `/fr/admin/connexion`
// stands in for the moderation surface: `/fr/admin` itself redirects
// unauthenticated visitors on mount, so auditing it unauthenticated would
// measure the redirect, not the admin/moderation charter chrome.
//
// The next two routes are the comparator journey (Epic 9, ETNI-485 · FR44):
// `/fr/comparer` is the picker shell, `/fr/comparer/familles/FLG_BANTU/FLG_MANDE`
// is one seeded comparison — both FLG ids already appear above as known-good
// staging data, reused here so the route doesn't depend on unverified seed ids.
//
// The last route is the links page (Epic 11, Story 11.11 · AR20): the
// EgoNetworkGraph mounts here lazily (next/dynamic ssr:false), and this gate
// ensures the graph's keyboard/ARIA contract stays at zero serious/critical.
//
// `/fr/migrations` (Epic 12, Story 12.10 · ETNI-523 · FR84) audits the
// server-rendered baseline: both the "Carte" and "Récit" tab panels are
// `forceMount`-ed (page.tsx), so this single load covers the Récit
// text-equivalent content plus the inactive Carte panel's static markup.
// Interactive states (tab switch, sheet-open) need real DOM interaction and
// are covered separately by e2e/migrations-atlas-a11y.spec.ts, which runs
// under e2e.yml with no continue-on-error.
//
// `/fr/quiz` (Epic 10, Story 10.11 · ETNI-500 · FR71) audits the
// server-rendered segment picker. The interactive session states (a played
// question, the reveal, the score screen) need real DOM interaction and are
// covered separately by e2e/quiz-journey-a11y.spec.ts, which runs under
// e2e.yml with no continue-on-error.
const LIVE_ROUTES_BASE_URL = process.env.A11Y_LIVE_BASE_URL;
const LIVE_ROUTES = [
  "/fr",
  "/fr/noms",
  "/fr/peuples",
  "/fr/recherche",
  "/fr/mentions-legales",
  "/fr/admin/connexion",
  "/fr/familles/FLG_BANTU",
  "/fr/peuples/PPL_WOLOF",
  "/fr/pays/SEN",
  "/fr/comparer",
  "/fr/comparer/familles/FLG_BANTU/FLG_MANDE",
  "/fr/peuples/PPL_WOLOF/liens",
  "/fr/migrations",
  "/fr/quiz",
];

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
  const page = await context.newPage();
  let hasBlockingViolations = false;

  try {
    for (const route of LIVE_ROUTES) {
      const url = `${LIVE_ROUTES_BASE_URL}${route}`;
      process.stdout.write(`🔍 Testing live route: ${route}... `);

      try {
        const response = await page.goto(url, {
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
          console.log(`❌ HTTP ${status} — route did not render`);
          hasBlockingViolations = true;
          continue;
        }

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .options(AXE_RUN_OPTIONS)
          .analyze();

        // Live routes gate on both `serious` and `critical` — stricter than
        // the Storybook check, which still tolerates the known Module #0
        // color-token violations tracked separately.
        const reportable = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        );

        if (reportable.length > 0) {
          console.log(`❌ ${reportable.length} violation(s)`);
          hasBlockingViolations = true;

          for (const violation of reportable as AxeViolation[]) {
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
        } else {
          console.log("✅ Passed");
        }
      } catch (error) {
        console.log(`❌ Error: ${(error as Error).message}`);
        hasBlockingViolations = true;
      }
    }
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
    const page = await context.newPage();

    console.log("📚 Fetching story list...");
    const stories = await getStoryIds(page);
    console.log(`   Found ${stories.length} stories to test\n`);

    for (const story of stories) {
      const storyUrl = `http://localhost:${STORYBOOK_PORT}/iframe.html?id=${story.id}&viewMode=story`;

      process.stdout.write(`🔍 Testing: ${story.title} - ${story.name}... `);

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
        const reportable = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        );
        const blocking = reportable.filter((v) => v.impact === "critical");

        if (reportable.length > 0) {
          const tag = blocking.length > 0 ? "❌" : "⚠️";
          console.log(`${tag} ${reportable.length} violation(s)`);
          if (blocking.length > 0) hasViolations = true;
          violationSummary.push({
            storyId: story.id,
            violations: reportable as AxeViolation[],
          });
        } else {
          console.log("✅ Passed");
        }
      } catch (error) {
        console.log(`⚠️  Error: ${(error as Error).message}`);
      }
    }

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

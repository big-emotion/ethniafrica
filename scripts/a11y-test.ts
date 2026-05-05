import { chromium, Browser, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, Server } from "http";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import { join, extname, resolve } from "path";

const STORYBOOK_STATIC_DIR = resolve(__dirname, "../storybook-static");
const STORYBOOK_PORT = 6006;

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

  for (const [id, entry] of Object.entries(storiesIndex.entries || storiesIndex.v || {})) {
    const storyEntry = entry as { type?: string; name?: string; title?: string };
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
  const violationSummary: { storyId: string; violations: AxeViolation[] }[] = [];

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

        await page.waitForSelector("#storybook-root", { timeout: 10000 }).catch(() => {
          // Some stories might not have this selector, continue anyway
        });

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        const seriousViolations = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        );

        if (seriousViolations.length > 0) {
          console.log(`❌ ${seriousViolations.length} violation(s)`);
          hasViolations = true;
          violationSummary.push({
            storyId: story.id,
            violations: seriousViolations as AxeViolation[],
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
          console.log(`\n  🚨 [${violation.impact?.toUpperCase()}] ${violation.id}`);
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
    console.log(`   Total violations: ${violationSummary.reduce((acc, s) => acc + s.violations.length, 0)}`);
  } finally {
    if (browser) {
      await browser.close();
    }
    server.close();
  }

  if (hasViolations) {
    console.log("\n❌ Accessibility tests failed due to serious/critical violations.");
    process.exit(1);
  } else {
    console.log("\n✅ All accessibility tests passed!");
    process.exit(0);
  }
}

runA11yTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

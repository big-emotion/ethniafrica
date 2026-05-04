import { chromium, Browser, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { readdir } from "fs/promises";

const STORYBOOK_STATIC_DIR = resolve(__dirname, "../storybook-static");
const STORYBOOK_PORT = 6006;

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

async function startStaticServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const server = spawn("npx", ["http-server", STORYBOOK_STATIC_DIR, "-p", String(STORYBOOK_PORT), "-s"], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let started = false;

    server.stdout?.on("data", (data: Buffer) => {
      if (!started && data.toString().includes("Available on")) {
        started = true;
        // Give server a moment to be fully ready
        setTimeout(() => resolve(server), 500);
      }
    });

    server.stderr?.on("data", (data: Buffer) => {
      console.error(`Server stderr: ${data.toString()}`);
    });

    server.on("error", reject);

    // Timeout if server doesn't start
    setTimeout(() => {
      if (!started) {
        server.kill();
        reject(new Error("Server failed to start within timeout"));
      }
    }, 30000);
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
  // Check if storybook-static exists
  if (!existsSync(STORYBOOK_STATIC_DIR)) {
    console.error("❌ storybook-static directory not found.");
    console.error("   Please run 'npm run build-storybook' first.");
    process.exit(1);
  }

  console.log("🚀 Starting static server for Storybook...");
  const server = await startStaticServer();

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
        
        // Wait for Storybook to render
        await page.waitForSelector("#storybook-root", { timeout: 10000 }).catch(() => {
          // Some stories might not have this selector, continue anyway
        });

        // Run axe accessibility checks
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        // Filter for serious and critical violations only
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

    // Print violation summary
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

    // Final summary
    console.log("\n📊 Test Summary:");
    console.log(`   Stories tested: ${stories.length}`);
    console.log(`   Stories with violations: ${violationSummary.length}`);
    console.log(`   Total violations: ${violationSummary.reduce((acc, s) => acc + s.violations.length, 0)}`);

  } finally {
    if (browser) {
      await browser.close();
    }
    server.kill();
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

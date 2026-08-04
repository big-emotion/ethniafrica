import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const lighthouseConfig = require("../../.lighthouserc.js");

describe("browser quality-gate routes", () => {
  // @req REQ-019
  it("audits canonical AFRIK identifiers instead of display-name slugs", () => {
    expect(lighthouseConfig.ci.collect.url).toContain(
      "http://localhost:3000/fr/pays/SEN"
    );
    expect(lighthouseConfig.ci.collect.url).toContain(
      "http://localhost:3000/fr/peuples/PPL_WOLOF"
    );
    expect(lighthouseConfig.ci.collect.puppeteerScript).toBe(
      "./scripts/lighthouse-setup.cjs"
    );
    expect(lighthouseConfig.ci.collect.puppeteerLaunchOptions.args).toContain(
      "--no-sandbox"
    );

    const axeScript = readFileSync(
      resolve(process.cwd(), "scripts/a11y-test.ts"),
      "utf8"
    );
    expect(axeScript).toContain('"/fr/peuples/PPL_WOLOF"');
    expect(axeScript).not.toContain('"/fr/peuples/wolof"');
  });

  // @req REQ-046
  it("installs a discoverable Chromium binary before running Lighthouse", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/lighthouse.yml"),
      "utf8"
    );

    expect(workflow).toContain("playwright install --with-deps chromium");
    expect(workflow).toContain("CHROME_PATH");
  });

  // @req REQ-046
  it("enforces stable mobile performance and responsiveness budgets", () => {
    const assertions = lighthouseConfig.ci.assert.assertions;

    expect(assertions["categories:performance"]).toEqual([
      "error",
      { minScore: 0.8 },
    ]);
    expect(assertions["largest-contentful-paint"]).toEqual([
      "error",
      { maxNumericValue: 5500 },
    ]);
    expect(assertions["total-blocking-time"]).toEqual([
      "error",
      { maxNumericValue: 300 },
    ]);
  });
});

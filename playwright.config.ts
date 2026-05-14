import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

// Reference device profile per TEA Test Design ASR-7.
// Africa History target audience: lycéenne in Dakar on entry-level Android, 4G, rationed data.
// Persona thresholds (Amina 10 s, Ngozi 30 s) are SLOs against this profile.
const referenceMobile = {
  ...devices["Pixel 5"],
  viewport: { width: 430, height: 812 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
};

const referenceTablet = {
  ...devices["iPad Mini"],
  viewport: { width: 720, height: 1024 },
};

const referenceDesktop = {
  ...devices["Desktop Chrome"],
  viewport: { width: 800, height: 900 },
};

const moderatorDesktop = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1280, height: 900 },
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,
  reporter: isCI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["junit", { outputFile: "playwright-report/results.xml" }],
      ]
    : [["list"], ["html", { open: "on-failure" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "fr-FR",
    timezoneId: "Africa/Dakar",
    extraHTTPHeaders: {
      // ASR-3: cache-bypass header honored only when NODE_ENV !== 'production'.
      "X-Test-Bypass-Cache": "1",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /\.setup\.ts$/,
    },
    // Mobile-first non-negotiable per project-context.md.
    // Most persona E2E run here; this is the source-of-truth viewport.
    {
      name: "mobile-430",
      use: referenceMobile,
      dependencies: ["setup"],
      testIgnore: /\.setup\.ts$/,
    },
    // Widening passes — should not introduce new features, only confirm layout.
    {
      name: "tablet-720",
      use: referenceTablet,
      dependencies: ["setup"],
      testIgnore: /\.setup\.ts$/,
      grep: /@cross-viewport/,
    },
    {
      name: "desktop-800",
      use: referenceDesktop,
      dependencies: ["setup"],
      testIgnore: /\.setup\.ts$/,
      grep: /@cross-viewport/,
    },
    // Fatou (moderator) journey runs on desktop ≥ 1024 px per UX spec L91.
    {
      name: "moderator-1024",
      use: moderatorDesktop,
      dependencies: ["setup"],
      testIgnore: /\.setup\.ts$/,
      grep: /@fatou/,
    },
  ],
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});

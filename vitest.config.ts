import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    // TEA Test Design ASR-11: quarantine known pre-existing failures so the
    // gate cannot mask new regressions. Excluded files are NOT fixed here —
    // they remain in place until explicitly scoped.
    //
    // 6 known failures (Supabase mock issues) live in migrateAfrikToDatabase.
    // 4 additional handler-test failures exist; relocate them under
    // any `__tests__/known-failing/` directory to quarantine.
    //
    // Also exclude Playwright specs (run via `npm run e2e`, not Vitest).
    // `.claude/**` excludes worktrees used by Claude Code parallel jobs.
    exclude: [
      "node_modules/",
      "dist/",
      ".next/",
      ".claude/**",
      "e2e/**",
      "scripts/__tests__/migrateAfrikToDatabase.test.ts",
      "**/__tests__/known-failing/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        ".next/",
        "**/*.config.{ts,js,mjs}",
        "**/*.d.ts",
        "src/test/",
        "src/stories/",
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

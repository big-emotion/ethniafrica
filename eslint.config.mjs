import nextConfig from "eslint-config-next";
import tsConfig from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextConfig,
  ...tsConfig,

  // =============================================================================
  // NFR33, AR28: Enforce structured logging via @/lib/api/logger
  // =============================================================================
  // Console methods (log, warn, error, etc.) are forbidden in server-side code.
  // Direct console usage bypasses structured logging, making it harder to:
  // - Aggregate and search logs in production
  // - Correlate logs with request IDs and user context
  // - Control log levels across environments
  //
  // Use the sanctioned logger instead: import { logger } from "@/lib/api/logger"
  //
  // Console IS allowed in:
  // - Client-side components (browser console is appropriate for client debugging)
  // - Test files (debugging tests is acceptable)
  // - Scripts (CLI tools need terminal output)
  // - The logger itself (it wraps console methods)
  // =============================================================================

  // Enforce no-console for server-side API paths only
  {
    files: [
      "src/api/**/*.ts",
      "src/api/**/*.tsx",
      "src/app/api/**/*.ts",
      "src/app/api/**/*.tsx",
      "src/lib/api/**/*.ts",
      "src/lib/api/**/*.tsx",
      "src/lib/afrikLoader.ts",
    ],
    rules: {
      "no-console": "error",
    },
  },

  // Allow console in the logger itself (it wraps console methods)
  {
    files: ["src/lib/api/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // Allow console in test files (debugging tests is acceptable)
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**/*"],
    rules: {
      "no-console": "off",
    },
  },

  // Allow console in scripts (CLI tools need terminal output)
  {
    files: ["scripts/**/*.ts", "scripts/**/*.js"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;

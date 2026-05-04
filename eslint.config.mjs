import nextConfig from "eslint-config-next";
import tsConfig from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextConfig,
  ...tsConfig,

  // =============================================================================
  // NFR33, AR28: Enforce structured logging via @/lib/api/logger
  // =============================================================================
  // Console methods (log, warn, error, etc.) are forbidden in production code.
  // Direct console usage bypasses structured logging, making it harder to:
  // - Aggregate and search logs in production
  // - Correlate logs with request IDs and user context
  // - Control log levels across environments
  //
  // Use the sanctioned logger instead: import { logger } from "@/lib/api/logger"
  // =============================================================================
  {
    rules: {
      "no-console": "error",
    },
  },

  // Allow console in test files (debugging tests is acceptable)
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**/*"],
    rules: {
      "no-console": "off",
    },
  },

  // Allow console in the logger itself (it wraps console methods)
  {
    files: ["src/lib/api/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;

// -----------------------------------------------------------------------------
// AR41: Why this file uses flat config and `eslint .` instead of `next lint`
// -----------------------------------------------------------------------------
// Next.js ≤15 ships a `next lint` command that wraps ESLint v8 with a legacy
// .eslintrc-style config.  ESLint v9 (used here) dropped legacy config support
// and requires the flat-config format (eslint.config.*).  `next lint` v15/v16
// does not yet invoke the flat-config path, so it throws a configuration error
// (AR41) when eslint.config.mjs is the only config file present.
//
// Deliberate trade-off: the lint script uses bare `eslint .` with this flat
// config instead of `next lint`.  All Next.js-specific rules remain active
// because `eslint-config-next` (spread below) includes them, including
// `@next/next/no-html-link-for-anchor` and the full `@next/next` plugin rule
// set.  No Next.js rules are lost; only the `next lint` wrapper is bypassed.
// -----------------------------------------------------------------------------
import { createRequire } from "node:module";
import nextConfig from "eslint-config-next";
import tsConfig from "eslint-config-next/typescript";

// ETNI-21: load the Africa History plugin (CommonJS, lives under eslint/).
const require = createRequire(import.meta.url);
const afhPlugin = require("./eslint/plugins/afh.js");

const eslintConfig = [
  ...nextConfig,
  ...tsConfig,

  // ETNI-21: ESLint custom-rule sources must remain CommonJS (the ESLint
  // plugin API is CJS). Globally ignore them so we don't fight no-require-imports.
  {
    ignores: ["eslint/**"],
  },

  // ===========================================================================
  // ETNI-21 / UX-DR49 rule 3: --afh-error misuse detector
  // ---------------------------------------------------------------------------
  // The `--afh-error` token is reserved for components whose filename signals
  // an error / invalid / broken context. The rule fires elsewhere to keep the
  // design-system warning vocabulary unambiguous.
  // ===========================================================================
  {
    files: [
      "src/components/**/*.{ts,tsx,js,jsx}",
      "src/app/**/*.{ts,tsx,js,jsx}",
    ],
    ignores: [
      "**/*.stories.*",
      "**/*.test.*",
      "**/__tests__/**",
      "**/*.mdx",
    ],
    plugins: { afh: afhPlugin },
    rules: {
      "afh/afh-error-misuse": "error",
    },
  },

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
      // Loader utilities are server-side only and have been migrated to logger;
      // guard against future console.* regressions in these files (NFR33, AR28).
      "src/lib/afrik/**/*.ts",
      "src/lib/afrikLoader.ts",
      // Auth and Supabase utilities are server-side only; enforce logger usage
      // so future console.* regressions in these directories fail lint (NFR33).
      "src/lib/auth/**/*.ts",
      "src/lib/supabase/**/*.ts",
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

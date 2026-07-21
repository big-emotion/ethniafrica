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
  // plugin API is CJS). Scope the no-require-imports relaxation to these
  // files only — the files themselves still get parsed and linted for
  // every other rule (we just allow `require(...)` here).
  {
    files: ["eslint/**/*.{js,cjs,mjs,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
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
    ignores: ["**/*.stories.*", "**/*.test.*", "**/__tests__/**", "**/*.mdx"],
    plugins: { afh: afhPlugin },
    rules: {
      "afh/afh-error-misuse": "error",
    },
  },

  // ===========================================================================
  // UX-DR49 rule 1: no-bare-people-name — decolonial posture
  // ---------------------------------------------------------------------------
  // People/language name bindings must be rendered through
  // <AutonymExonymHeading> so autonyms keep their exonyms and lang attribute.
  // Applies to the people and country component trees, where such names appear.
  //
  // AutonymExonymHeading itself is exempt: it is the sanctioned renderer, so
  // its own implementation necessarily paints the name fields directly.
  // ===========================================================================
  {
    files: [
      "src/components/people/**/*.{ts,tsx,js,jsx}",
      "src/components/country/**/*.{ts,tsx,js,jsx}",
    ],
    ignores: [
      "src/components/ui/AutonymExonymHeading.tsx",
      "**/*.stories.*",
      "**/*.test.*",
      "**/__tests__/**",
    ],
    plugins: { afh: afhPlugin },
    rules: {
      "afh/no-bare-people-name": "error",
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

  // ===========================================================================
  // `any` is a warning in tests, an error everywhere else
  // ---------------------------------------------------------------------------
  // Test doubles for the Supabase client are deep, chained builder objects
  // (`from().select().eq()...`). Reproducing those types by hand asserts
  // nothing about the code under test and breaks whenever the SDK's internal
  // types move, so `any` is the honest annotation there.
  //
  // It stays a warning rather than "off" so the count remains visible, and it
  // stays an error in src/ — production code that reaches for `any` is exactly
  // what the rule is for. Note tsconfig runs with strict: false, so `any` in a
  // test is not hiding a check that would otherwise be enforced.
  // ===========================================================================
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**/*.{ts,tsx}",
      "**/test/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;

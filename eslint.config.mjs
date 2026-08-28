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

  // The reference mockups are a design oracle, not project source: nothing in
  // src/ imports them, and the visual-parity specs compare against captures
  // taken from them. They must stay byte-equivalent to the published artifacts,
  // so neither --fix nor a formatter may touch them. .prettierignore already
  // excludes them and names this file as doing the same.
  {
    ignores: ["docs/design/mockups/**"],
  },

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
      "src/components/country/AutonymExonymHeading.tsx",
      "**/*.stories.*",
      "**/*.test.*",
      "**/__tests__/**",
    ],
    plugins: { afh: afhPlugin },
    rules: {
      "afh/no-bare-people-name": "error",
    },
  },

  // ===========================================================================
  // Typography charter §7: afh/no-raw-font-size — one scale, and only one
  // ---------------------------------------------------------------------------
  // `error` across all of src/ from day one. The list below is the DEBT
  // REGISTER: one line per file that still carries a raw font size, with its
  // count. Each migration lot DELETES its lines and never adds one.
  //
  // Two properties make the register self-maintaining. Deleting a line without
  // fixing the file turns CI red, so it cannot rot into a stale allow-list.
  // And a file not on the list fails the moment it grows a raw size, so a
  // directory awaiting its lot cannot quietly accumulate new debt — which a
  // ratchet scoped by directory would have permitted for six lots running.
  //
  // Register empty = ratchet closed. What remains then is the bench: stories
  // are exempt for good — a rendering bench, not a product surface, and
  // touching the 15 dirty ones costs 66 @req backfills for zero visible pixel.
  //
  // .css files are NOT covered: ESLint never parses them. country-tokens.css
  // and people-tokens.css are guarded by src/styles/__tests__/colorTokens.test.ts.
  // ===========================================================================
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "**/*.stories.*",
      "**/*.test.*",
      "**/__tests__/**",
      "**/*.mdx",

      // --- lot 4 · country/ (78) ---------------------------------------
      "src/components/country/PeoplesSection.tsx", // 25
      "src/components/country/CountryHero.tsx", // 7 tw + 3 css
      "src/components/country/KingdomsSection.tsx", // 9
      "src/components/country/LanguagesSection.tsx", // 8
      "src/components/country/SourcesFooter.tsx", // 6
      "src/components/country/AutonymExonymHeading.tsx", // 5
      "src/components/country/HistoricalFactsSection.tsx", // 5
      "src/components/country/CultureGrid.tsx", // 4
      "src/components/country/HistoryTimeline.tsx", // 3
      "src/components/country/OriginBanner.tsx", // 3
      // --- lot 5 · source-transparency/ (3) ----------------------------
      "src/components/source-transparency/DoctrineLinkCard.tsx", // 2
      "src/components/source-transparency/SourceChainSheet.tsx", // 1
      // --- lot 6 · people/, migrations/ (14) ---------------------------
      "src/components/people/PeopleCountriesSection.tsx", // 7
      "src/components/people/PeopleDetailViewV2.tsx", // 3
      "src/components/people/PeopleRelatedPeoplesSection.tsx", // 3
      "src/components/migrations/MigrationPathLayer.tsx", // 1
      // --- lot 7 · relations/, hubs/ (11) ------------------------------
      "src/components/relations/EgoNetworkGraph.tsx", // 4
      "src/components/hubs/ComprendreQuestionSpine.tsx", // 4 css
      "src/components/hubs/JouerFaceOff.tsx", // 3 css
      // --- lot 10 · home/ — DESIGN GATE (26) ---------------------------
      "src/components/home/AccessAxes.tsx", // 9 css
      "src/components/home/AxisModulePanel.tsx", // 6 css
      "src/components/home/HomeGlobe.tsx", // 4 css
      "src/components/home/HomeHero.tsx", // 3 css
      "src/components/home/HeroFamilyCrown.tsx", // 1 css
      "src/components/home/HeroMigrationPaths.tsx", // 1 css
      "src/components/home/HeroProvenanceChip.tsx", // 1
      "src/components/home/TrustStrip.tsx", // 1 css
    ],
    plugins: { afh: afhPlugin },
    rules: {
      "afh/no-raw-font-size": "error",
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

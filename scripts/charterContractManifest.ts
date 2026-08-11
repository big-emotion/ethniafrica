import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SEARCH_DIRS = ["src", "scripts"];
const CHARTER_NAME_PATTERN = /charter/i;
const TEST_FILE_PATTERN = /\.test\.tsx?$/;
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  "storybook-static",
]);

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
      out.push(full);
    }
  }
}

/**
 * Every `*.test.ts(x)` file under src/ and scripts/ whose path contains
 * "charter" (case-insensitive). This is the discovery half of the manifest
 * (ETNI-982 · FR110): a newly added `fooCharter.test.tsx` is picked up here
 * automatically, with no manifest edit required.
 */
export function discoverCharterNamedTests(): string[] {
  const out: string[] = [];
  for (const dir of SEARCH_DIRS) walk(join(ROOT, dir), out);
  return out
    .filter((file) => CHARTER_NAME_PATTERN.test(file))
    .map((file) => relative(ROOT, file))
    .sort();
}

/**
 * Charter-v2 contract files (FR110 · charter §9–§10) whose filename doesn't
 * contain "charter", so `discoverCharterNamedTests()` can't find them by
 * naming convention alone. Each is documented so the aggregate list stays
 * auditable instead of silently drifting.
 */
export const CHARTER_CONTRACT_EXTRA_FILES = [
  // Retired night-token inventory, kept as a negative contract now that
  // charterTokens.test.ts is the tokens source of truth.
  "src/lib/__tests__/nightTokens.test.ts",
  // Asserts the home hero dot field sources --afh-cat-ocre, not a literal.
  "src/components/home/__tests__/DottedContinent.test.tsx",
  // Charter V2 search overlay restyle (ETNI-802 · FR107).
  "src/components/__tests__/SearchModalV2.test.tsx",
  // Asserts --accent/--accent-tint charter token wiring per entity type.
  "src/components/fiche/__tests__/FichePanel.test.tsx",
  // Cross-family route matrix contract (ETNI-979/980/981 · FR110).
  "scripts/__tests__/qualityGateRoutes.test.ts",
] as const;

/**
 * The full aggregate: every discoverable *charter*-named test plus the
 * documented extras, deduplicated and sorted for a stable diff.
 */
export function charterContractFiles(): string[] {
  const files = new Set([
    ...discoverCharterNamedTests(),
    ...CHARTER_CONTRACT_EXTRA_FILES,
  ]);
  return [...files].sort();
}

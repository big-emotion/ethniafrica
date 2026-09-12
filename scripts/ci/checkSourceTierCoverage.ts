/**
 * CI gate — every AFRIK source must carry an explicit tier.
 *
 * The Source Tier Policy forbids nothing and labels everything, so the failure
 * mode is not "a weak source got cited" but "a source got cited with no stated
 * authority". `needs_review` is the honest placeholder the classification
 * codemod emits when neither the authorized source catalogue, the domain
 * rulings, nor an unambiguous published-citation shape can settle the tier.
 *
 * Usage: npx tsx scripts/ci/checkSourceTierCoverage.ts [datasetRoot]
 */
import fs from "fs";
import path from "path";

const DEFAULT_DATASET_ROOT = "dataset/source/afrik";

/**
 * A ratchet, not a budget — the same rule as `DEAD_CODE_CEILINGS`. A count
 * above it fails, and so does a count below it: a ceiling left standing above
 * the real number is room to regress into without a red run, which is how this
 * one sat at 1 010 while the corpus measured 1 002. A classification pass
 * lowers this line in the same change; NEVER raise it.
 *
 * 1010 -> 1002, measured 2026-09-12.
 */
export const NEEDS_REVIEW_RATCHET = 1002;

/** The doctrine's three tiers, plus the numeric tiers the name/relation/migration fiches still carry. */
const TIERS_WITH_AUTHORITY = new Set<unknown>([
  "official",
  "referenced",
  "unverified",
  1,
  2,
]);

export interface UntieredSource {
  file: string;
  path: string;
  title: string;
}

export interface SourceTierCoverageResult {
  ok: boolean;
  count: number;
  threshold: number;
  untiered: UntieredSource[];
  /** Why the gate failed, including which line to change; null when it holds. */
  error: string | null;
}

function collectJsonFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort()) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectJsonFiles(fullPath));
    else if (entry.name.endsWith(".json")) files.push(fullPath);
  }
  return files;
}

function describeSource(source: unknown): string {
  if (typeof source === "string") return source;
  if (source && typeof source === "object") {
    const title = (source as { title?: unknown; reference?: unknown }).title;
    const reference = (source as { reference?: unknown }).reference;
    if (typeof title === "string") return title;
    if (typeof reference === "string") return reference;
  }
  return "(untitled source)";
}

function visit(
  file: string,
  value: unknown,
  valuePath: string,
  untiered: UntieredSource[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      visit(file, item, `${valuePath}[${index}]`, untiered)
    );
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = valuePath ? `${valuePath}.${key}` : key;

    if (key === "sources" && Array.isArray(child)) {
      child.forEach((source, index) => {
        const tier =
          source && typeof source === "object"
            ? (source as { tier?: unknown }).tier
            : undefined;
        if (TIERS_WITH_AUTHORITY.has(tier)) return;

        untiered.push({
          file,
          path: `${childPath}[${index}]`,
          title: describeSource(source),
        });
      });
    }

    visit(file, child, childPath, untiered);
  }
}

export function findUntieredSources(datasetRoot: string): UntieredSource[] {
  const untiered: UntieredSource[] = [];

  for (const fullPath of collectJsonFiles(datasetRoot)) {
    let fiche: unknown;
    try {
      fiche = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    } catch {
      continue;
    }
    visit(path.relative(datasetRoot, fullPath), fiche, "", untiered);
  }

  return untiered;
}

export function checkSourceTierCoverage(
  datasetRoot: string,
  threshold: number
): SourceTierCoverageResult {
  const untiered = findUntieredSources(datasetRoot);
  const count = untiered.length;

  let error: string | null = null;
  if (count > threshold) {
    error = `Source tier coverage regressed: ${count} untiered sources exceed the ratchet of ${threshold}. Tier the new sources — do not raise the ratchet.`;
  } else if (count < threshold) {
    error = `Source tier coverage improved: ${count} untiered sources against a ratchet of ${threshold} — lower NEEDS_REVIEW_RATCHET to ${count} in scripts/ci/checkSourceTierCoverage.ts so it cannot climb back.`;
  }

  return { ok: error === null, count, threshold, untiered, error };
}

function main(): void {
  const datasetRoot = process.argv[2] ?? DEFAULT_DATASET_ROOT;
  const result = checkSourceTierCoverage(datasetRoot, NEEDS_REVIEW_RATCHET);

  const byFile = new Map<string, number>();
  for (const entry of result.untiered) {
    byFile.set(entry.file, (byFile.get(entry.file) ?? 0) + 1);
  }

  console.log(
    `Untiered sources: ${result.count} across ${byFile.size} fiches (ratchet: ${result.threshold})`
  );

  if (result.count > result.threshold) {
    for (const entry of result.untiered.slice(0, 40)) {
      console.log(`  ${entry.file} ${entry.path}: ${entry.title}`);
    }
  }

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("checkSourceTierCoverage.ts")) {
  main();
}

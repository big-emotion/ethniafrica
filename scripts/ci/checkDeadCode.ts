/**
 * The dead-code gate.
 *
 * The repository had ten CI gates and none of them asked the one question that
 * matters for code nobody calls: *does anyone still import this?* Nothing did,
 * so thirty-two unreferenced files, thirteen never-imported dependencies and a
 * whole dead branch of the Supabase architecture accumulated in plain sight —
 * a dead file reads exactly like a live one until you trace its callers.
 *
 * This runs knip and compares its tallies against a recorded ceiling. The
 * ceiling is a **ratchet, not a budget**: a count above it fails, and so does a
 * count below it, because a ceiling left standing above the real number is a
 * licence to climb back to it. Lowering it is a one-line commit, which is the
 * point — the number in this file is the audit trail.
 *
 * `ADVISORY_CATEGORIES` is the escape hatch, and it works like
 * `SOFT_CHECK_NAMES` in validateAfrikData.ts: softening a check is a visible,
 * deliberate line in a source file, never a flag buried in a config.
 */

import { execFileSync } from "node:child_process";

/** Every bucket knip can put a finding in. */
export const DEAD_CODE_CATEGORIES = [
  "files",
  "dependencies",
  "devDependencies",
  "optionalPeerDependencies",
  "unlisted",
  "binaries",
  "unresolved",
  "exports",
  "types",
  "duplicates",
] as const;

export type DeadCodeCategory = (typeof DEAD_CODE_CATEGORIES)[number];
export type DeadCodeCounts = Partial<Record<string, number>>;

/**
 * What the repository measured on 2026-09-02, after axis 3 of the
 * consolidation audit removed the corpus of dead files and dependencies.
 *
 * The six zeros are load-bearing: files, dependencies, devDependencies,
 * unlisted, binaries and duplicates were all driven to nothing, so any new one
 * is a regression on its first commit rather than a number to argue about.
 *
 * `exports` and `types` are what is left to examine one by one — shadcn
 * re-exports the repo keeps as library surface, a client-side cache module,
 * three loader cache-clearing helpers, and fifty-two exported types nothing
 * consumes. They are held where they stand, so they can only go down.
 */
export const DEAD_CODE_CEILINGS: Readonly<Record<DeadCodeCategory, number>> = {
  files: 0,
  dependencies: 0,
  devDependencies: 0,
  optionalPeerDependencies: 0,
  unlisted: 0,
  binaries: 0,
  unresolved: 0,
  // Lowered from 25/52 when contributions became flags: the legacy
  // /admin/contributions console, its API routes and `lib/auth/supabase-auth`
  // went with it, and the ratchet does not let the room they freed be reused.
  //
  // 24 -> 23 when the axis-graph home was removed. AccessAxes and the fifteen
  // modules that existed only to serve it took four exports with them —
  // HERO_PREVIEW_KINDS, getFacetByPage, and the two country reads the
  // synthesis rail needed — and the ratchet keeps that room freed too.
  exports: 23,
  types: 50,
  duplicates: 0,
};

/**
 * Categories reported without failing the build.
 *
 * Empty, and deliberately so. The audit that opened this gate recommended
 * starting non-blocking because the report was drowning in 267 unused exports,
 * of which 120 were a redundant `export default` beside a named one. Those are
 * gone, every count is at a number someone has actually read, and a gate that
 * cannot fail is not a gate. A category belongs here only while a named
 * backlog is being burned down, with the reason written beside it.
 */
export const ADVISORY_CATEGORIES: ReadonlySet<string> = new Set<string>();

interface KnipFileIssue {
  file?: string;
  [category: string]: unknown;
}

export interface KnipReport {
  files?: string[];
  issues?: KnipFileIssue[];
}

export interface DeadCodeVerdict {
  ok: boolean;
  errors: string[];
  notices: string[];
}

/** Collapse knip's per-file report into one number per category. */
export function tallyKnipReport(report: KnipReport): DeadCodeCounts {
  const counts: DeadCodeCounts = {};
  for (const category of DEAD_CODE_CATEGORIES) counts[category] = 0;

  counts.files = (report.files ?? []).length;

  for (const issue of report.issues ?? []) {
    for (const [category, found] of Object.entries(issue)) {
      if (category === "file" || !Array.isArray(found)) continue;
      counts[category] = (counts[category] ?? 0) + found.length;
    }
  }

  return counts;
}

export function evaluateDeadCode(
  counts: DeadCodeCounts,
  options: {
    ceilings?: Readonly<Record<string, number>>;
    advisory?: ReadonlySet<string>;
  } = {}
): DeadCodeVerdict {
  const ceilings = options.ceilings ?? DEAD_CODE_CEILINGS;
  const advisory = options.advisory ?? ADVISORY_CATEGORIES;

  const errors: string[] = [];
  const notices: string[] = [];

  for (const [category, found] of Object.entries(counts)) {
    const count = found ?? 0;
    const ceiling = ceilings[category];

    if (ceiling === undefined) {
      if (count > 0) {
        errors.push(
          `${category}: ${count} finding(s) and no ceiling to measure them against — add one to DEAD_CODE_CEILINGS.`
        );
      }
      continue;
    }

    if (count > ceiling) {
      const line = `${category}: ${count} exceeds the ceiling of ${ceiling}.`;
      if (advisory.has(category)) notices.push(`${line} (advisory)`);
      else errors.push(line);
      continue;
    }

    if (count < ceiling) {
      const line = `${category}: down to ${count} from a ceiling of ${ceiling} — lower the ${category} ceiling to ${count} in scripts/ci/checkDeadCode.ts so it cannot climb back.`;
      if (advisory.has(category)) notices.push(`${line} (advisory)`);
      else errors.push(line);
    }
  }

  return { ok: errors.length === 0, errors, notices };
}

function runKnip(): KnipReport {
  const stdout = execFileSync(
    "npx",
    ["knip", "--reporter", "json", "--no-progress"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return JSON.parse(stdout) as KnipReport;
}

function main(): void {
  let report: KnipReport;
  try {
    report = runKnip();
  } catch (error) {
    // knip exits non-zero whenever it has findings, which is the normal case
    // here — the findings are on stdout and are what we came for. Only an
    // unparseable stdout means knip itself failed.
    const stdout = (error as { stdout?: string }).stdout ?? "";
    try {
      report = JSON.parse(stdout) as KnipReport;
    } catch {
      console.error("check:dead — knip did not produce a report.");
      console.error(stdout || (error as Error).message);
      process.exit(1);
      return;
    }
  }

  const counts = tallyKnipReport(report);
  const verdict = evaluateDeadCode(counts);

  console.log("check:dead — knip tallies against the recorded ceilings\n");
  for (const category of DEAD_CODE_CATEGORIES) {
    const count = counts[category] ?? 0;
    const ceiling = DEAD_CODE_CEILINGS[category];
    const mark = count === ceiling ? " " : count > ceiling ? "↑" : "↓";
    console.log(
      `  ${mark} ${category.padEnd(26)} ${String(count).padStart(4)} / ${ceiling}`
    );
  }

  for (const notice of verdict.notices) console.log(`\n  advisory: ${notice}`);
  for (const error of verdict.errors) console.error(`\n  ✖ ${error}`);

  if (!verdict.ok) {
    console.error(
      "\nRun `npx knip --reporter symbols` to see the findings themselves."
    );
    process.exit(1);
  }

  console.log("\nNo dead code beyond the recorded ceilings.");
}

if (process.argv[1]?.endsWith("checkDeadCode.ts")) main();

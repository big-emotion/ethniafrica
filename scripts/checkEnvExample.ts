#!/usr/bin/env tsx
/**
 * checkEnvExample.ts
 *
 * Keeps `.env.example` and the code honest **in both directions**:
 *
 *   - every `process.env.<NAME>` the code reads is documented, so a new
 *     variable cannot ship as a surprise for whoever deploys next;
 *   - every entry in the file is read by something, so retired variables do
 *     not accumulate as a list of things nobody dares delete.
 *
 * The second direction was missing, and the cost was measurable: `USE_SUPABASE`
 * survived the flag's removal, and three site-identity variables outlived the
 * hard-coded metadata that replaced them. The check reported OK throughout,
 * because it only ever looked one way.
 *
 * Scope matters as much as direction. It used to walk `src/` and `scripts/`
 * only, so the Sentry DSNs — read at the repository root in
 * `sentry.{server,client,edge}.config.ts` — were invisible to it. Deleting
 * `NEXT_PUBLIC_SENTRY_DSN` from the file would have kept the gate green.
 *
 * Exits 0 on success, 1 listing what disagrees otherwise.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOTS = ["src", "scripts", "e2e", "supabase"];

/** Env reads live here too, and used to go unseen. */
const ROOT_FILES = [
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "playwright.config.ts",
  "vitest.config.ts",
  ".lighthouserc.js",
  "sentry.server.config.ts",
  "sentry.client.config.ts",
  "sentry.edge.config.ts",
];

const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".claude",
  "dist",
  "build",
]);

/**
 * The two directions do not share a scope, and deliberately so.
 *
 * Forward ("is what we read documented?") ignores tests: a name appearing in a
 * fixture is not a deployment requirement, and this file's own tests feed
 * sample env reads through as string input.
 *
 * Reverse ("is what we document read?") counts tests: the RLS suites genuinely
 * need TEST_SUPABASE_* and TEST_JWT_* set to run, so those entries belong in the
 * file, and ignoring tests would make the check demand their deletion.
 */
const TEST_PATH = /(^|[\\/])(__tests__)[\\/]|\.(test|spec)\.[tj]sx?$/;
const ENV_FILE = ".env.example";

/** Supplied by the runtime, never by us. */
const ALWAYS_DEFINED = new Set(["NODE_ENV", "CI", "VERCEL", "VERCEL_URL"]);

/**
 * Documented on purpose while nothing reads it. Each entry needs a reason,
 * because "unread" is otherwise indistinguishable from "forgotten".
 */
const DOCUMENTED_WITHOUT_A_READER = new Map<string, string>([
  [
    "CLOUDFLARE_TURNSTILE_SITE_KEY",
    "the widget is never mounted with it — the entry documents that gap, and deleting it would hide a half-wired protection",
  ],
  [
    "SENTRY_AUTH_TOKEN",
    "read by the @sentry/nextjs build plugin, never through process.env, so no source file can reference it",
  ],
]);

export interface SourceFile {
  path: string;
  source: string;
}

export interface EnvAudit {
  undocumented: string[];
  unread: string[];
  ok: boolean;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTS.has(full.slice(full.lastIndexOf(".")))) out.push(full);
  }
  return out;
}

export function collectReferences(files: SourceFile[]): Set<string> {
  const pattern = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  const references = new Set<string>();
  for (const file of files) {
    for (const match of file.source.matchAll(pattern)) {
      references.add(match[1]);
    }
  }
  return references;
}

export function collectDocumented(contents: string): Set<string> {
  const documented = new Set<string>();
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    documented.add(trimmed.slice(0, separator).trim());
  }
  return documented;
}

export function auditEnvExample(input: {
  /** Reads outside tests — what a deployment must actually supply. */
  referenced: Set<string>;
  /** Reads anywhere, tests included — what any entry could be justified by. */
  referencedIncludingTests?: Set<string>;
  documented: Set<string>;
}): EnvAudit {
  const readAnywhere = input.referencedIncludingTests ?? input.referenced;

  const undocumented = [...input.referenced]
    .filter((name) => !ALWAYS_DEFINED.has(name) && !input.documented.has(name))
    .sort();

  const unread = [...input.documented]
    .filter(
      (name) =>
        !readAnywhere.has(name) && !DOCUMENTED_WITHOUT_A_READER.has(name)
    )
    .sort();

  return {
    undocumented,
    unread,
    ok: undocumented.length === 0 && unread.length === 0,
  };
}

function main(): void {
  const repoRoot = process.cwd();

  const paths = [
    ...ROOTS.flatMap((root) => {
      try {
        return walk(resolve(repoRoot, root));
      } catch {
        return [];
      }
    }),
    ...ROOT_FILES.map((name) => resolve(repoRoot, name)).filter(existsSync),
  ];

  const files: SourceFile[] = paths.map((path) => ({
    path: relative(repoRoot, path),
    source: readFileSync(path, "utf8"),
  }));

  const referenced = collectReferences(
    files.filter((file) => !TEST_PATH.test(file.path))
  );
  const referencedIncludingTests = collectReferences(files);
  const documented = collectDocumented(
    readFileSync(resolve(repoRoot, ENV_FILE), "utf8")
  );
  const result = auditEnvExample({
    referenced,
    referencedIncludingTests,
    documented,
  });

  if (result.ok) {
    console.log(
      `OK — ${referenced.size} env reference(s) across ${files.length} file(s), all documented in ${ENV_FILE}; every entry there is read.`
    );
    return;
  }

  if (result.undocumented.length > 0) {
    console.error(
      `${ENV_FILE} is missing ${result.undocumented.length} variable(s) the code reads:`
    );
    for (const name of result.undocumented) console.error(`  - ${name}`);
  }

  if (result.unread.length > 0) {
    console.error(
      `${ENV_FILE} documents ${result.unread.length} variable(s) nothing reads. Delete them, or add them to DOCUMENTED_WITHOUT_A_READER with the reason:`
    );
    for (const name of result.unread) console.error(`  - ${name}`);
  }

  process.exit(1);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  main();
}

#!/usr/bin/env tsx
/**
 * checkEnvExample.ts
 *
 * Walks `src/` and `scripts/` and asserts that every `process.env.<NAME>`
 * reference is documented in `.env.example`. Run in CI to prevent drift.
 *
 * Exits 0 on success, 1 with a list of undocumented vars otherwise.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOTS = ["src", "scripts"];
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".claude",
  "dist",
  "build",
  "__tests__",
]);
const ENV_FILE = ".env.example";

// process.env.NODE_ENV / process.env.CI / process.env.VERCEL_URL are always
// supplied by the runtime, not by us.
const ALWAYS_DEFINED = new Set(["NODE_ENV", "CI", "VERCEL_URL"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (EXTS.has(full.slice(full.lastIndexOf(".")))) out.push(full);
  }
  return out;
}

function collectReferences(files: string[]): Set<string> {
  const re = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  const refs = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) refs.add(m[1]);
  }
  return refs;
}

function collectDocumented(path: string): Set<string> {
  const lines = readFileSync(path, "utf8").split("\n");
  const documented = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    documented.add(trimmed.slice(0, eq).trim());
  }
  return documented;
}

function main() {
  const repoRoot = process.cwd();
  const files = ROOTS.flatMap((r) => {
    const dir = resolve(repoRoot, r);
    try {
      return walk(dir);
    } catch {
      return [];
    }
  });
  const referenced = collectReferences(files);
  const documented = collectDocumented(resolve(repoRoot, ENV_FILE));

  const missing: string[] = [];
  for (const name of referenced) {
    if (ALWAYS_DEFINED.has(name)) continue;
    if (!documented.has(name)) missing.push(name);
  }
  missing.sort();

  if (missing.length === 0) {
    console.log(
      `OK — all ${referenced.size} env references in src/ and scripts/ are documented in ${ENV_FILE}.`
    );
    return;
  }
  console.error(
    `${ENV_FILE} is missing ${missing.length} env var(s) referenced in code:`
  );
  for (const name of missing) console.error(`  - ${name}`);
  process.exit(1);
}

main();

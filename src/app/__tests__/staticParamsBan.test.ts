/**
 * The root layout awaits `connection()` to read the per-request CSP nonce
 * (REQ-115), which makes every route request-time by construction. A page that
 * also declares `generateStaticParams` is therefore not merely redundant: Next
 * marks the route static, then the layout's dynamic read throws
 * DYNAMIC_SERVER_USAGE at request time and the route answers 500.
 *
 * That is exactly how the eleven Jouer games went down — `/[lang]/jouer/[jeu]`
 * returned only `{ jeu }` and never enumerated `[lang]`, so nothing was
 * prerendered and every game served a 500 while the build stayed green.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const APP_DIR = resolve(process.cwd(), "src/app");
const ROOT_LAYOUT = resolve(APP_DIR, "layout.tsx");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return /^(page|layout|route)\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Matches the export itself, so prose about it stays allowed. */
const STATIC_PARAMS_EXPORT =
  /export\s+(?:async\s+)?(?:function\s+generateStaticParams\b|const\s+generateStaticParams\b)/;

describe("static rendering is unavailable while the root layout is dynamic", () => {
  // @req REQ-115
  it("keeps the root layout reading the request", () => {
    expect(readFileSync(ROOT_LAYOUT, "utf8")).toMatch(/await connection\(\)/);
  });

  // @req REQ-120
  it("declares generateStaticParams nowhere under src/app", () => {
    const offenders = routeFiles(APP_DIR)
      .filter((file) => STATIC_PARAMS_EXPORT.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});

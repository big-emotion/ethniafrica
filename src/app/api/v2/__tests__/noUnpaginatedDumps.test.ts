import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No `/api/v2` route hands back a whole table.
 *
 * `validatePerPage` caps a page at 100 rows, and that cap is the documented
 * contract of the public API. Three routes used to sit outside it:
 * `internal/{peoples,countries,language-families}` each called a `getAllAfrik*`
 * helper with no page argument and returned the entire table as one payload.
 *
 * Their comment said "not exposed publicly", but they lived under `/api/v2/*`,
 * where `src/middleware.ts` grants a same-origin bypass keyed on `Origin` /
 * `Referer` — headers only a browser is obliged to tell the truth about. Any
 * non-browser client sets them freely, so the routes were an unauthenticated
 * dump of every people, country and language family. Nothing in the tree
 * called them; the contribution form uses `/api/contributions/entities/*`,
 * which is a different path with its own handler. They were deleted rather
 * than paginated, because a paginated copy of a route with no callers is just
 * a smaller thing to keep working.
 *
 * This guards the shape rather than the three filenames: a `getAllAfrik*` call
 * under `src/app/api/v2` is by construction unpaginated, so the rule is that
 * none appears there. `/api/download` and `/api/contributions/*` are outside
 * `/api/v2` and outside this rule — they answer to their own contracts.
 */

const V2_ROUTES = resolve(process.cwd(), "src/app/api/v2");

/** Every route module under `/api/v2`, tests excluded. */
function routeFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "__tests__") continue;
      found.push(...routeFiles(path));
      continue;
    }
    if (entry === "route.ts") found.push(path);
  }
  return found;
}

describe("no /api/v2 route returns a whole table", () => {
  // The rule is worthless if it walks nothing.
  // @req REQ-052
  it("finds the v2 route modules to check", () => {
    expect(routeFiles(V2_ROUTES).length).toBeGreaterThan(20);
  });

  // @req REQ-052
  it("calls no unpaginated getAllAfrik* helper", () => {
    const offenders = routeFiles(V2_ROUTES)
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .map((text, index) => ({ file, line: index + 1, text }))
          .filter(({ text }) => /\bgetAllAfrik[A-Za-z]*\s*\(/.test(text))
      )
      .map(({ file, line }) => `${relative(process.cwd(), file)}:${line}`);

    expect(offenders).toEqual([]);
  });
});

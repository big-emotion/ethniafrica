/**
 * AC2 of ETNI-1415: whatever module of the site searches the corpus, it goes
 * through one surface. That surface is `search()` in `src/lib/afrikLoader.ts`,
 * the only browser code allowed to call `/api/v2/search`.
 *
 * The rule cannot be expressed as a type or an import ban — a component that
 * calls `fetch` directly imports nothing — so it is asserted against the
 * component sources themselves. Three call sites had already drifted (the
 * compare picker and both fetches of the /recherche page), each re-deriving
 * the query shape and getting a different part of it wrong.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS_ROOT = join(process.cwd(), "src", "components");

/**
 * A `fetch(...)` whose URL literal names the search endpoint. A URL built out
 * of a variable escapes this, which is the accepted limit: the pattern catches
 * how the endpoint is actually reached in this codebase.
 */
const DIRECT_SEARCH_FETCH =
  /fetch\(\s*(?:`[^`]*|"[^"]*|'[^']*)\/api\/v2\/search/g;

/** Whole-file scan: prettier wraps a long `fetch(` across lines. */
function directSearchFetchesIn(source: string): number[] {
  return [...source.matchAll(DIRECT_SEARCH_FETCH)].map(
    (match) => source.slice(0, match.index).split("\n").length
  );
}

function sourceFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      // Test files legitimately name the endpoint when they stub the network.
      return entry.name === "__tests__" ? [] : sourceFilesUnder(path);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

describe("single search surface", () => {
  // @req REQ-002
  it("finds no component reaching /api/v2/search outside afrikLoader.search", () => {
    const offenders = sourceFilesUnder(COMPONENTS_ROOT).flatMap((path) =>
      directSearchFetchesIn(readFileSync(path, "utf8")).map(
        (line) => `${path}:${line}`
      )
    );

    expect(
      offenders,
      `These components fetch /api/v2/search directly instead of calling search() from @/lib/afrikLoader:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  // @req REQ-002
  it("scans a non-empty set of component sources", () => {
    // Guards the guard: a broken walk would report zero offenders forever.
    expect(sourceFilesUnder(COMPONENTS_ROOT).length).toBeGreaterThan(100);
  });
});

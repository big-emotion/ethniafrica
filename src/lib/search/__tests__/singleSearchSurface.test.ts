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

/**
 * The transport had a keeper; the interface on top of it had none.
 *
 * Four components each grew their own suggest field on the one transport, and
 * none of them shared a line with the others: four debounces, four listboxes,
 * four keyboard contracts, and an ARIA role that came out `combobox` twice,
 * `searchbox` once and absent once. Nobody chose that — it is what a
 * capability written four times produces, and nothing stopped a fifth.
 *
 * `useAutocomplete` is that keeper. A component that owns a suggestion list is
 * required to get it from there rather than re-derive it.
 */
describe("single autocomplete surface", () => {
  /**
   * A suggest field: it lists the corpus search's answers as they are typed.
   * A listbox alone is not enough to qualify — the atlas target picker owns
   * one over a fixed roster of countries, with no field and nothing to fetch,
   * and is a select rather than an autocomplete.
   */
  const SUGGESTS_FROM_THE_CORPUS = (source: string) =>
    /role=["']listbox["']/.test(source) &&
    /from "@\/lib\/afrikLoader"/.test(source);

  const USES_THE_HOOK = /useAutocomplete/;

  function suggestFieldsUnder(root: string): string[] {
    return sourceFilesUnder(root).filter((path) =>
      SUGGESTS_FROM_THE_CORPUS(readFileSync(path, "utf8"))
    );
  }

  // @req REQ-002
  it("finds no suggest field re-deriving the behaviour instead of using the hook", () => {
    const offenders = suggestFieldsUnder(COMPONENTS_ROOT).filter(
      (path) => !USES_THE_HOOK.test(readFileSync(path, "utf8"))
    );

    expect(
      offenders,
      `These components re-implement the suggest behaviour instead of using useAutocomplete from @/hooks/use-autocomplete:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  // @req REQ-002
  it("still sees the search bars it is meant to be holding", () => {
    // Guards the guard: a predicate that matched nothing would pass forever.
    expect(suggestFieldsUnder(COMPONENTS_ROOT).length).toBeGreaterThanOrEqual(
      4
    );
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * A family has exactly one rendering: the charter fiche at
 * `/fr/familles/<id>`.
 *
 * The tabbed `LanguageFamilyDetailView` under `?family=<id>` was the second
 * one. Nothing gated the two apart — only the shape of the URL — so the
 * directory, the header search, the search page and the legacy slug redirect
 * all reached the tabs while the globe fiche went unseen. These guards fail
 * the moment a second surface or a `?family=` link comes back.
 */

const SRC_ROOT = resolve(__dirname, "../../..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return entry === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

/**
 * Comments are where the retired route is explained, so they are the one place
 * `?family=` must still be allowed to appear — a guard that forbade the words
 * would forbid documenting why they are gone.
 */
function codeWithoutComments(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

describe("single family rendering", () => {
  // @req REQ-091
  it("keeps no source file linking a family through a query parameter", () => {
    const offenders = sourceFiles(SRC_ROOT).filter((path) =>
      codeWithoutComments(path).includes("?family=")
    );

    expect(offenders.map((path) => path.slice(SRC_ROOT.length + 1))).toEqual(
      []
    );
  });

  // @req REQ-091
  it("keeps no second family detail component beside the fiche", () => {
    const offenders = sourceFiles(SRC_ROOT).filter((path) =>
      path.endsWith("LanguageFamilyDetailView.tsx")
    );

    expect(offenders.map((path) => path.slice(SRC_ROOT.length + 1))).toEqual(
      []
    );
  });
});

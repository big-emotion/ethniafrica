/**
 * Every module the code declares is listed, and every listed module leads
 * somewhere. Nothing about that may depend on the environment.
 *
 * This is written down as a test because the failure it guards against is
 * invisible: the quiz shipped complete — route, page, 11 879 questions — and
 * hung from `NEXT_PUBLIC_FEATURE_QUIZ`. Unset, the page answered `notFound()`
 * and the hub dropped the entry, so recette served a Jouer panel with three
 * games and no quiz, and nothing anywhere was red. A module a reader cannot
 * reach is not a module; it is unmerged work.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCESS_MODES,
  MODULE_DEFINITIONS,
  getModulesForAccessMode,
  getNavModules,
} from "@/lib/hubs/moduleRegistry";
import { getModuleHref } from "@/lib/hubs/moduleHref";

const SOURCE_ROOT = join(process.cwd(), "src");

function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      found.push(full);
    }
  }
  return found;
}

describe("module visibility charter", () => {
  // @req REQ-114
  it("lets no environment variable decide whether a feature is shown", () => {
    // Reading one is the offence, not naming one: the quiz suites still
    // mention `NEXT_PUBLIC_FEATURE_QUIZ` precisely to prove it is inert.
    const offenders = sourceFiles(SOURCE_ROOT)
      .filter((file) => !/\.test\.tsx?$/.test(file))
      .filter((file) =>
        readFileSync(file, "utf-8").includes("process.env.NEXT_PUBLIC_FEATURE_")
      )
      .map((file) => file.slice(SOURCE_ROOT.length + 1));

    expect(offenders).toEqual([]);
  });

  // @req REQ-114
  it("gives every declared module a link", () => {
    for (const definition of MODULE_DEFINITIONS) {
      const href = definition.gameSlug
        ? `/fr/jouer/${definition.gameSlug}`
        : getModuleHref(definition, "fr");

      expect(href, `${definition.id} resolves to no route`).toBeTruthy();
    }
  });

  // @req REQ-114
  it("hides no module from the header", () => {
    for (const mode of ACCESS_MODES) {
      expect(getNavModules(mode)).toEqual(getModulesForAccessMode(mode));
    }
  });

  /**
   * A module waits on its corpus or on nothing at all. The two states this
   * replaces — "flagged" and "unavailable" — both meant "declared but
   * unreachable", which is the one thing the charter forbids.
   */
  // @req REQ-114
  it("knows only two reasons a module might not be live, neither of them a switch", () => {
    for (const definition of MODULE_DEFINITIONS) {
      expect(["data", "static"]).toContain(definition.availability);
      if (definition.availability === "data") {
        expect(
          definition.dataSource,
          `${definition.id} is data-backed but names no table`
        ).toBeTruthy();
      }
    }
  });
});

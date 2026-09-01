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
  EDITORIAL_READINESS_STATES,
  MODULE_DEFINITIONS,
  getModulesForAccessMode,
  getNavModules,
} from "@/lib/hubs/moduleRegistry";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { isModuleOffered } from "@/lib/hubs/moduleOffer";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";

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
        ? `${getAxisHubRoute("fr", "jeux")}/${definition.gameSlug}`
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

  /**
   * Editorial readiness is the third reason, and the charter (§3) admits it
   * on one condition: it must be a fact about the corpus, not about the
   * machine reading it. `availability` is measured, `editorialReadiness` is
   * declared — and a declaration only holds if every entry makes one. Left
   * optional, a module added without the field ships as mature by omission,
   * which is the exact bug the field exists to prevent.
   */
  // @req REQ-114
  it("makes every module declare its editorial readiness rather than inherit one", () => {
    for (const definition of MODULE_DEFINITIONS) {
      expect(
        Object.prototype.hasOwnProperty.call(definition, "editorialReadiness"),
        `${definition.id} declares no editorialReadiness`
      ).toBe(true);
      expect(EDITORIAL_READINESS_STATES).toContain(
        definition.editorialReadiness
      );
    }
  });

  /**
   * The distinction the charter insists on: a draft module is not hidden and
   * not unbuilt. It is reachable — by URL, by the header, by a crawler — and
   * simply not yet worth being invited into. That is what separates this
   * field from `NEXT_PUBLIC_FEATURE_QUIZ`, which made a finished route answer
   * `notFound()` on one machine and serve on another.
   */
  // @req REQ-114
  it("leaves a module in preparation reachable, listed and routed", () => {
    const drafts = MODULE_DEFINITIONS.filter(
      (definition) => definition.editorialReadiness === "draft"
    );

    expect(
      drafts.length,
      "no module exercises the draft state"
    ).toBeGreaterThan(0);

    for (const definition of drafts) {
      const href = definition.gameSlug
        ? `${getAxisHubRoute("fr", "jeux")}/${definition.gameSlug}`
        : getModuleHref(definition, "fr");
      expect(href, `${definition.id} is draft and unroutable`).toBeTruthy();
      expect(getNavModules(definition.accessMode)).toContainEqual(definition);
    }
  });

  /**
   * Readiness and availability answer different questions, so nothing may
   * make one stand in for the other: a `static` module has no table to
   * consult, and marking it draft is the only way to say it is not ready.
   * Tying readiness to `availability === "data"` would have left
   * `regards-colonisation` permanently mature.
   */
  /**
   * The other side of the same coin: reachable, and not invited. The charter
   * asks for the inert row on *every* surface that lists modules, and the one
   * that broke the rule is the header — it resolved clickability from
   * `getModuleHref` alone, which answers "does this route exist", never "is it
   * worth the trip". A probe map full of rows must not be able to talk a draft
   * module back into the menu.
   */
  // @req REQ-114
  it("withholds the invitation from a draft module on any surface", () => {
    const offeredEverything = Object.fromEntries(
      MODULE_DEFINITIONS.map((definition) => [definition.id, true])
    );

    for (const definition of MODULE_DEFINITIONS) {
      expect(
        isModuleOffered(definition, offeredEverything),
        `${definition.id} is offered against its declared readiness`
      ).toBe(definition.editorialReadiness !== "draft");
    }
  });

  // @req REQ-114
  it("lets a static module be declared unready", () => {
    const colonisation = MODULE_DEFINITIONS.find(
      (definition) => definition.id === "regards-colonisation"
    );

    expect(colonisation?.availability).toBe("static");
    expect(colonisation?.editorialReadiness).toBe("draft");
  });

  /**
   * An empty table is not a readiness declaration, and leaning on one is a
   * bet that nobody fills it halfway.
   *
   * `noms` was `ready` on the reasoning that `availability` already spoke for
   * it: `name_records` is empty, so the module reads Bientôt anyway. But the
   * corpus behind it holds exactly one fiche — `dataset/source/afrik/noms/`
   * has `PPL_YORUBA.json` and nothing else — for 803 peoples. The loader is
   * wired (`migrateAfrikToDatabase.ts` calls `loadNameRecords`), so the day
   * that single fiche lands the probe flips the module live with one name out
   * of 803, and an atlas of names is offered that names one people.
   *
   * Readiness is the field that can say "not worth the trip" while the route
   * stays built and reachable. That is the whole reason it is declared rather
   * than measured.
   */
  // @req REQ-114
  it("does not let an empty table stand in for a readiness declaration", () => {
    const noms = MODULE_DEFINITIONS.find(
      (definition) => definition.id === "noms"
    );

    expect(noms?.availability).toBe("data");
    expect(noms?.dataSource).toBe("name_records");
    expect(noms?.editorialReadiness).toBe("draft");
  });
});

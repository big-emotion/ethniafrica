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
import { getAxisForPage, getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getSiteTree } from "@/lib/siteTree";

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

  /**
   * The amendment of 7 September 2026 (atlas-charter.md §3). The header used
   * to list the registry entire, on the reading that a module absent from the
   * menu is a module absent from the corpus. Appellations disproved it: an
   * index of attested name forms, offered on every page of the site, drew 0
   * visits out of 219 pageviews in the 30 days to 6 September — because it
   * answers a name the reader already holds instead of inviting them to
   * browse, which is a lookup and not an entry point.
   *
   * So the menu is curated and the exhaustive indexes are elsewhere, and the
   * one thing the registry may say about the difference is `unlisted`. It is a
   * declaration like `editorialReadiness` and unlike `NEXT_PUBLIC_FEATURE_QUIZ`:
   * the route stays built, the trail keeps its axis crumb, the crawler keeps
   * its link. What it withholds is one row in one menu.
   */
  // @req REQ-114
  it("hides from the header only what the registry declares unlisted", () => {
    for (const mode of ACCESS_MODES) {
      expect(getNavModules(mode)).toEqual(
        getModulesForAccessMode(mode).filter(
          (definition) => !definition.unlisted
        )
      );
    }
  });

  /**
   * An unlisted module is relegated, never retired — otherwise `unlisted`
   * becomes the feature flag this file exists to forbid, wearing a new word.
   * It keeps its route, it keeps the axis crumb its URL promises, and it keeps
   * a line in the exhaustive index a reader reaches when the menu did not
   * offer what they were after.
   */
  // @req REQ-114
  it("keeps an unlisted module routed, on its axis and in the site plan", () => {
    const unlisted = MODULE_DEFINITIONS.filter(
      (definition) => definition.unlisted
    );

    expect(
      unlisted.length,
      "no module exercises the unlisted state"
    ).toBeGreaterThan(0);

    const planned = new Set(
      getSiteTree("fr").flatMap((section) =>
        section.links.map((link) => link.href)
      )
    );

    for (const definition of unlisted) {
      const href = getModuleHref(definition, "fr");
      expect(href, `${definition.id} is unlisted and unroutable`).toBeTruthy();
      expect(
        getAxisForPage(definition.page),
        `${definition.id} lost the axis its URL promises`
      ).toBe(definition.accessMode);
      expect(
        planned,
        `${definition.id} is unlisted and absent from the site plan`
      ).toContain(href);
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

  /** The derived corpus now gives Appellations enough breadth to be offered. */
  // @req REQ-114
  it("offers Appellations once the published people fiches feed its corpus", () => {
    const noms = MODULE_DEFINITIONS.find(
      (definition) => definition.id === "noms"
    );

    expect(noms?.availability).toBe("data");
    expect(noms?.dataSource).toBe("name_records");
    expect(noms?.editorialReadiness).toBe("ready");
  });
});

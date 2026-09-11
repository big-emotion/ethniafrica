import { describe, expect, it } from "vitest";

import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import { isModulePublished } from "@/lib/hubs/moduleOffer";
import {
  NOMMER_CHAPTER_KEYS,
  getLocalizedRoute,
  getNommerChapterRoute,
} from "@/lib/routing";
import { getSiteTree, getSiteTreePaths } from "@/lib/siteTree";
import { NOMMER_CHAPTERS_EN } from "@/lib/dossiers/nommer/chapters/index.en";
import { GAME_DEFINITIONS_EN } from "@/lib/games/gameRegistry.en";

describe("getSiteTree — access modes are sections and destinations", () => {
  /**
   * The three axis hubs are pages again (brand charter §8.6), so each rubric
   * opens on its own. This tree feeds both `/fr/plan-du-site` and
   * `sitemap.xml`, and it is the sitemap's only source — a page absent here is
   * a page no crawler is told about, which is the mirror of the fault the
   * assertion this replaces was guarding: between ETNI-1555 and 7 September
   * 2026 a leftover entry would have published a 404 instead.
   */
  // @req REQ-114
  it("opens each axis rubric on its own hub", () => {
    const hrefs = getSiteTree("fr").flatMap((section) =>
      section.links.map((link) => link.href)
    );

    for (const page of ["atlasHub", "dossiersHub", "jeuxHub"] as const) {
      expect(hrefs, page).toContain(getLocalizedRoute("fr", page));
    }
  });

  // @req REQ-110
  it("still names its rubrics with the canonical access-mode labels", () => {
    const tree = getSiteTree("fr");

    expect(tree.find((section) => section.id === "dossiers")?.title).toBe(
      ACCESS_MODE_LABELS.dossiers
    );
    expect(tree.find((section) => section.id === "jeux")?.title).toBe(
      ACCESS_MODE_LABELS.jeux
    );
  });
});

describe("getSiteTree — English reader copy", () => {
  // @req REQ-145
  it("renders English sections, notes and editorial titles on /en", () => {
    const tree = getSiteTree("en");
    const text = JSON.stringify(tree);

    expect(tree.find((section) => section.id === "accueil")?.title).toBe(
      "Home"
    );
    expect(tree.find((section) => section.id === "corpus")?.title).toBe(
      "The atlas, in AFRIK order"
    );
    // Only while the dossier is published: the freeze takes the chapters out
    // of the plan entirely, in both locales.
    if (isModulePublished("nommer")) {
      for (const chapter of Object.values(NOMMER_CHAPTERS_EN)) {
        expect(text).toContain(chapter.title);
      }
    }
    expect(text).toContain(GAME_DEFINITIONS_EN.mercator.nameEn);
    expect(text).not.toContain("Qui a donné ce nom ?");
    expect(text).not.toContain("Le globe et les trois axes.");
  });
});

// The languages and patronymes index pages (ETNI-1795) ship in the same
// atlas section as families/peoples/countries — a page nobody can navigate
// to is not browsable (ETNI-1801).
describe("getSiteTree — the corpus section lists languages and patronymes", () => {
  // @req REQ-139
  it("links to the languages index, in AFRIK hierarchy order", () => {
    const corpus = getSiteTree("fr").find((section) => section.id === "corpus");
    const hrefs = corpus?.links.map((link) => link.href) ?? [];

    const languagesHref = getLocalizedRoute("fr", "languages");
    expect(hrefs).toContain(languagesHref);
    // Family -> language -> people -> country: languages sits right after
    // families, ahead of peoples and countries.
    expect(hrefs.indexOf(languagesHref)).toBe(
      hrefs.indexOf(getLocalizedRoute("fr", "families")) + 1
    );
    expect(hrefs.indexOf(languagesHref)).toBeLessThan(
      hrefs.indexOf(getLocalizedRoute("fr", "peoples"))
    );
  });

  // @req REQ-139
  it("links to the patronymes index with a French note", () => {
    const corpus = getSiteTree("fr").find((section) => section.id === "corpus");
    const patronymesLink = corpus?.links.find(
      (link) => link.href === getLocalizedRoute("fr", "patronymes")
    );

    expect(patronymesLink).toBeDefined();
    expect(patronymesLink?.note?.trim().length ?? 0).toBeGreaterThan(0);
  });

  // Same rubric-in-sitemap treatment as families/peoples/countries and the
  // already-shipped appellations index (ETNI-1453): the tree feeds
  // src/app/sitemap.ts too, so a reachable hub route is a crawlable one.
  // @req REQ-139
  it("carries the languages and patronymes hub routes into the sitemap paths", () => {
    const paths = getSiteTreePaths("fr");

    expect(paths).toContain(getLocalizedRoute("fr", "languages"));
    expect(paths).toContain(getLocalizedRoute("fr", "patronymes"));
  });
});

/**
 * The dossier is the first doorway of its rubric, and its five chapters are
 * listed under it. That is a deliberate exception to this file's own rule —
 * "the reader wants the ways in" — because `getSiteTreePaths` is the sole feed
 * of the sitemap, and a chapter left out is an editorial page no crawler is
 * ever told about.
 *
 * The freeze reverses the exception rather than cancelling it: while `nommer`
 * is withdrawn, listing a chapter tells the crawler about a page that answers
 * 404, which is the same argument pointing the other way. Both tests below
 * read publication rather than a fixed expectation, so they hold in either
 * state and say, on the day the dossier returns, what returning owes.
 */
describe("getSiteTree — the Nommer dossier and its chapters", () => {
  // @req REQ-110
  it("opens the dossiers rubric on its theme directory", () => {
    const dossiers = getSiteTree("fr").find(
      (section) => section.id === "dossiers"
    );

    expect(dossiers?.links[0]?.href).toBe(
      getLocalizedRoute("fr", "dossiersHub")
    );
  });

  // @req REQ-110
  it("lists the five chapters in reading order, or none at all", () => {
    const dossiers = getSiteTree("fr").find(
      (section) => section.id === "dossiers"
    );
    const hrefs = dossiers?.links.map((link) => link.href) ?? [];

    const chapterHrefs = NOMMER_CHAPTER_KEYS.map((key) =>
      getNommerChapterRoute("fr", key)
    );

    if (!isModulePublished("nommer")) {
      expect(hrefs).not.toContain(getLocalizedRoute("fr", "nommer"));
      expect(hrefs.filter((href) => chapterHrefs.includes(href))).toEqual([]);
      return;
    }

    const start = hrefs.indexOf(getLocalizedRoute("fr", "nommer")) + 1;
    expect(hrefs.slice(start, start + chapterHrefs.length)).toEqual(
      chapterHrefs
    );
  });

  // @req REQ-110
  it("feeds the sitemap every chapter it lists, and no other", () => {
    const paths = getSiteTreePaths("fr");
    const published = isModulePublished("nommer");

    for (const key of NOMMER_CHAPTER_KEYS) {
      expect(paths.includes(getNommerChapterRoute("fr", key)), key).toBe(
        published
      );
    }
  });
});

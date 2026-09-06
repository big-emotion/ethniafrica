import { describe, expect, it } from "vitest";

import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import {
  NOMMER_CHAPTER_KEYS,
  getLocalizedRoute,
  getNommerChapterRoute,
} from "@/lib/routing";
import { getSiteTree, getSiteTreePaths } from "@/lib/siteTree";
import { NOMMER_CHAPTERS_EN } from "@/lib/dossiers/nommer/chapters/index.en";
import { GAME_DEFINITIONS_EN } from "@/lib/games/gameRegistry.en";

describe("getSiteTree — access modes are sections, not destinations", () => {
  /**
   * The three axis landing pages were deleted with ETNI-1555: the reader picks
   * a module, never an intermediate page. The tree feeds both `/fr/plan-du-site`
   * and `sitemap.xml`, so a leftover entry does not merely dead-end a reader —
   * it publishes a 404 to every crawler that reads the sitemap.
   */
  // @req REQ-114
  it("links to no retired axis landing page", () => {
    const hrefs = getSiteTree("fr").flatMap((section) =>
      section.links.map((link) => link.href)
    );

    for (const page of ["atlasHub", "jeuxHub"] as const) {
      expect(hrefs, page).not.toContain(getLocalizedRoute("fr", page));
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
      "The corpus, in AFRIK order"
    );
    for (const chapter of Object.values(NOMMER_CHAPTERS_EN)) {
      expect(text).toContain(chapter.title);
    }
    expect(text).toContain(GAME_DEFINITIONS_EN.mercator.nameEn);
    expect(text).not.toContain("Qui a donné ce nom ?");
    expect(text).not.toContain("Le globe et les trois axes.");
  });
});

// The languages and patronymes index pages (ETNI-1795) ship in the same
// corpus section as families/peoples/countries — a page nobody can navigate
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

// The dossier is the first doorway of its rubric, and its five chapters are
// listed under it. That is a deliberate exception to this file's own rule —
// "the reader wants the ways in" — because `getSiteTreePaths` is the sole feed
// of the sitemap, and a chapter left out is an editorial page no crawler is
// ever told about.
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
  it("lists the five chapters, in reading order, right under it", () => {
    const dossiers = getSiteTree("fr").find(
      (section) => section.id === "dossiers"
    );
    const hrefs = dossiers?.links.map((link) => link.href) ?? [];

    const chapterHrefs = NOMMER_CHAPTER_KEYS.map((key) =>
      getNommerChapterRoute("fr", key)
    );

    const start = hrefs.indexOf(getLocalizedRoute("fr", "nommer")) + 1;
    expect(hrefs.slice(start, start + chapterHrefs.length)).toEqual(
      chapterHrefs
    );
  });

  // @req REQ-110
  it("puts every chapter in the paths the sitemap is built from", () => {
    const paths = getSiteTreePaths("fr");

    for (const key of NOMMER_CHAPTER_KEYS) {
      expect(paths).toContain(getNommerChapterRoute("fr", key));
    }
  });
});

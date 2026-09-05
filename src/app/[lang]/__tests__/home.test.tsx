import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OG_DESCRIPTION, OG_TITLE } from "@/lib/brand";
import { CORPUS_CLASSES } from "@/lib/home/corpusClasses";

const {
  getCorpusCountsMock,
  getContinentPeopleCountsMock,
  getHubModulesMock,
  loadHeroPreviewMock,
  loadSynthesisRailMock,
  drawHomeHeroVisualMock,
  drawDidYouKnowMotifMock,
} = vi.hoisted(() => ({
  getCorpusCountsMock: vi.fn(),
  getContinentPeopleCountsMock: vi.fn(),
  getHubModulesMock: vi.fn(),
  loadHeroPreviewMock: vi.fn(),
  loadSynthesisRailMock: vi.fn(),
  drawHomeHeroVisualMock: vi.fn(),
  drawDidYouKnowMotifMock: vi.fn(),
}));

const fixtureCounts = {
  peoples: 4213,
  countries: 91,
  families: 37,
  languages: 748,
  nameForms: 3134,
  patronymes: 33,
  migrations: 5,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/home/corpusCounts", () => ({
  getCorpusCounts: getCorpusCountsMock,
}));

vi.mock("@/api/v2/services/continentPeopleCounts", () => ({
  getContinentPeopleCounts: getContinentPeopleCountsMock,
}));

vi.mock("@/lib/home/seedWords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home/seedWords")>();
  return {
    ...actual,
    loadSeedWords: vi.fn(async () => actual.FALLBACK_SEED_WORDS),
  };
});

vi.mock("@/lib/hubs/moduleAvailability", () => ({
  getHubModules: getHubModulesMock,
}));

vi.mock("@/lib/home/heroPreviewData", () => ({
  loadHeroPreview: loadHeroPreviewMock,
}));

vi.mock("@/lib/home/synthesisRailData", () => ({
  loadSynthesisRail: loadSynthesisRailMock,
}));

vi.mock("@/lib/home/homeHeroVisuals", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/home/homeHeroVisuals")>();
  return {
    ...actual,
    drawHomeHeroVisual: drawHomeHeroVisualMock,
  };
});

vi.mock("@/lib/home/didYouKnowMotifs", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/home/didYouKnowMotifs")>();
  return {
    ...actual,
    drawDidYouKnowMotif: drawDidYouKnowMotifMock,
  };
});

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    flushBottom,
    language,
  }: {
    children: React.ReactNode;
    flushBottom?: boolean;
    language: string;
  }) => (
    <div
      data-testid="page-layout"
      data-flush-bottom={String(Boolean(flushBottom))}
      data-language={language}
    >
      {children}
    </div>
  ),
}));

vi.mock("@/components/atlas/ContinentGlobeStage", () => ({
  ContinentGlobeStage: () => <div data-testid="home-globe-stage" />,
}));

import Home, { generateMetadata } from "../page";

const routeParams = (lang: string) => Promise.resolve({ lang });

const renderHome = async () =>
  render(await Home({ params: routeParams("fr") }));

describe("home page — search, corpus scale and two facts (ETNI-1404)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCorpusCountsMock.mockResolvedValue(fixtureCounts);
    getContinentPeopleCountsMock.mockResolvedValue({});
    getHubModulesMock.mockResolvedValue([]);
    loadSynthesisRailMock.mockResolvedValue([]);
    drawHomeHeroVisualMock.mockReturnValue({ kind: "globe" });
    drawDidYouKnowMotifMock.mockReturnValue("mande-kora");
  });

  // @req REQ-044
  it("keeps one page title and the search-first hero", async () => {
    await renderHome();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  // @req REQ-113
  it("states the three documented totals and shows exactly two sourced facts", async () => {
    await renderHome();

    // Built from the registry, not spelled out: the labels were written into
    // this pattern once, and the day pays gave its tile to noms the assertion
    // failed on a band that was right. What the page owes is the declared
    // classes in the declared order, whichever three those are.
    expect(screen.getByTestId("home-corpus-counts").textContent).toMatch(
      new RegExp(
        CORPUS_CLASSES.map(({ tileLabel }) => tileLabel).join(".*"),
        "i"
      )
    );
    expect(screen.getAllByTestId("home-did-you-know")).toHaveLength(1);
    expect(
      screen
        .getByTestId("home-did-you-know")
        .querySelectorAll('[data-testid="home-dyk-official-source"]')
    ).toHaveLength(2);
    expect(screen.getAllByTestId("home-dyk-fact")).toHaveLength(2);
  });

  // The illustrated section is full bleed and is the final child of main, so
  // it owns the seam with the footer rather than leaving main's padding as a
  // strip of unrelated ground.
  // @req REQ-044
  it("lets the final section meet the footer without a bottom gap", async () => {
    await renderHome();

    expect(screen.getByTestId("page-layout")).toHaveAttribute(
      "data-flush-bottom",
      "true"
    );
  });

  // A rejected count query means “unknown”, never “empty”. The other hero
  // data still renders because each server read owns its own fallback, and
  // every tile keeps its label while withholding its figure — see
  // HomeCorpusCounts' own doctrine for a class whose total could not be read.
  // @req REQ-113
  it("keeps the home usable and withholds every tile figure on read failure", async () => {
    getCorpusCountsMock.mockRejectedValueOnce(new Error("database offline"));

    await renderHome();

    expect(screen.getByRole("search")).toBeInTheDocument();

    for (const { tileLabel } of CORPUS_CLASSES) {
      expect(screen.getByTestId("home-corpus-counts").textContent).toContain(
        tileLabel
      );
    }

    // Every class marked unreadable, and not one of them printed as a zero.
    // Read off each `dd` rather than the list's textContent: the band carries
    // its own <style> child, whose declarations are full of zeroes.
    const tiles = screen.getAllByTestId(/^home-count-/);
    expect(tiles).toHaveLength(3);
    for (const tile of tiles) {
      expect(tile).toHaveAttribute("data-state", "unavailable");
      expect(tile.querySelector("dd")?.textContent).toBe("Indisponible");
    }
  });

  // @req REQ-113
  // @req REQ-132
  it("does not render or load the presentation blocks moved to About or retired modules", async () => {
    await renderHome();

    for (const testId of [
      "home-purpose-blocks",
      "access-axes",
      "home-synthesis-rail",
      "home-featured-module",
      "home-trust-strip",
    ]) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    }
    expect(getHubModulesMock).not.toHaveBeenCalled();
    expect(loadHeroPreviewMock).not.toHaveBeenCalled();
    expect(loadSynthesisRailMock).not.toHaveBeenCalled();
  });

  // The globe's country signal remains a server-side dependency even though
  // the old FeaturedModule wrapper is gone.
  // @req REQ-115
  it("still resolves the continent people counts for the hero", async () => {
    await renderHome();

    expect(getContinentPeopleCountsMock).toHaveBeenCalledOnce();
  });

  // @req REQ-115
  it("draws a fresh right-hand visual for each page request", async () => {
    const image = {
      id: "test-map",
      src: "/images/home/al-idrisi-1154.jpg",
      alt: "Une carte historique de l'Afrique.",
      credit: "Carte de test — domaine public",
      position: "center",
    } as const;
    drawHomeHeroVisualMock
      .mockReturnValueOnce({ kind: "image", image })
      .mockReturnValueOnce({ kind: "globe" });

    const firstLoad = await renderHome();
    expect(screen.getByRole("img", { name: image.alt })).toBeInTheDocument();
    expect(screen.queryByTestId("home-globe-stage")).not.toBeInTheDocument();
    expect(getContinentPeopleCountsMock).not.toHaveBeenCalled();
    firstLoad.unmount();

    await renderHome();
    expect(screen.getByTestId("home-globe-stage")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: image.alt })
    ).not.toBeInTheDocument();
    expect(getContinentPeopleCountsMock).toHaveBeenCalledOnce();
    expect(drawHomeHeroVisualMock).toHaveBeenCalledTimes(2);
  });

  // @req REQ-115
  it("allows browser checks to request the globe without changing random visitors", async () => {
    drawHomeHeroVisualMock.mockReturnValue({
      kind: "image",
      image: {
        id: "test-map",
        src: "/images/home/al-idrisi-1154.jpg",
        alt: "Une carte historique de l'Afrique.",
        credit: "Carte de test — domaine public",
        position: "center",
      },
    });

    await render(
      await Home({
        params: routeParams("fr"),
        searchParams: Promise.resolve({ hero: "globe" }),
      })
    );

    expect(screen.getByTestId("home-globe-stage")).toBeInTheDocument();
    expect(getContinentPeopleCountsMock).toHaveBeenCalledOnce();
    expect(drawHomeHeroVisualMock).not.toHaveBeenCalled();
  });

  // @req REQ-115
  it("draws one fresh cultural background for each page request", async () => {
    drawDidYouKnowMotifMock
      .mockReturnValueOnce("mande-kora")
      .mockReturnValueOnce("punu-mukudj");

    const firstLoad = await renderHome();
    expect(screen.getByTestId("home-did-you-know")).toHaveAttribute(
      "data-motif",
      "mande-kora"
    );
    firstLoad.unmount();

    await renderHome();
    expect(screen.getByTestId("home-did-you-know")).toHaveAttribute(
      "data-motif",
      "punu-mukudj"
    );
    expect(drawDidYouKnowMotifMock).toHaveBeenCalledTimes(2);
  });

  // @req REQ-044
  it("declares the canonical and OpenGraph metadata", async () => {
    const metadata = await generateMetadata({ params: routeParams("fr") });

    expect(metadata.alternates?.canonical).toBe("/fr");
    expect(metadata.title).toBe(OG_TITLE);
    expect(metadata.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.title).toBe(OG_TITLE);
    expect(metadata.openGraph?.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.url).toBe("/fr");
  });

  // An English home declaring `/fr` canonical would tell every crawler the
  // page is a duplicate of the French one.
  // @req REQ-140
  it("points the canonical at the locale the route was served in", async () => {
    const metadata = await generateMetadata({ params: routeParams("en") });

    expect(metadata.alternates?.canonical).toBe("/en");
    expect(metadata.openGraph?.url).toBe("/en");
  });

  // @req REQ-140
  it("hands the shell the route's locale rather than a fixed one", async () => {
    render(await Home({ params: routeParams("en") }));

    expect(screen.getByTestId("page-layout")).toHaveAttribute(
      "data-language",
      "en"
    );
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OG_DESCRIPTION, OG_TITLE } from "@/lib/brand";

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
  }: {
    children: React.ReactNode;
    flushBottom?: boolean;
  }) => (
    <div
      data-testid="page-layout"
      data-flush-bottom={String(Boolean(flushBottom))}
    >
      {children}
    </div>
  ),
}));

vi.mock("@/components/atlas/ContinentGlobeStage", () => ({
  ContinentGlobeStage: () => <div data-testid="home-globe-stage" />,
}));

import Home, { metadata } from "../page";

const renderHome = async () => render(await Home());

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
  it("names the five real corpus classes in the headline and shows exactly two sourced facts", async () => {
    await renderHome();

    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      /peuples.*langues.*pays.*familles linguistiques.*appellations/i
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
  // the headline keeps every class word while dropping its figure — see
  // headlineSegments' own doctrine for a class whose total could not be read.
  // @req REQ-113
  it("keeps the home usable and drops every headline figure on read failure", async () => {
    getCorpusCountsMock.mockRejectedValueOnce(new Error("database offline"));

    const { container } = await renderHome();

    expect(screen.getByRole("search")).toBeInTheDocument();
    const segments = container.querySelectorAll(
      ".home-hero-headline-reel [data-reel-sizer] > span"
    );
    expect(Array.from(segments).map((el) => el.textContent)).toEqual([
      "peuples",
      "langues",
      "pays",
      "familles",
      "appellations",
    ]);
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
      await Home({ searchParams: Promise.resolve({ hero: "globe" }) })
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
  it("declares the canonical and OpenGraph metadata", () => {
    expect(metadata.alternates?.canonical).toBe("/fr");
    expect(metadata.title).toBe(OG_TITLE);
    expect(metadata.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.title).toBe(OG_TITLE);
    expect(metadata.openGraph?.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.url).toBe("/fr");
  });
});
